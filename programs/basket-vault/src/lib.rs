use anchor_lang::{
    prelude::*,
    solana_program::{
        instruction::{
            AccountMeta,
            Instruction,
        },
        program::invoke_signed,
    },
};

use anchor_spl::token_interface::{
    self,
    Burn,
    Mint,
    MintTo,
    TokenAccount,
    TokenInterface,
    TransferChecked,
};

declare_id!("5p7G79qSFHWFKiqK2LjeMLFWpPPATNxBroZnv8Do3QZB");

const MAX_CONSTITUENTS: usize = 10;
const BASIS_POINTS_DENOMINATOR: u64 = 10_000;

const JUPITER_SWAP_PROGRAM_ID: Pubkey =
    pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

// Anchor discriminator:
// sha256("global:route")[0..8]
const JUPITER_ROUTE_DISCRIMINATOR: [u8; 8] = [
    229, 23, 203, 151,
    122, 227, 173, 42,
];

// Anchor discriminator:
// sha256("global:shared_accounts_route")[0..8]
const JUPITER_SHARED_ACCOUNTS_ROUTE_DISCRIMINATOR: [u8; 8] = [
    193, 32, 155, 51,
    65, 214, 156, 129,
];

#[program]
pub mod basket_vault {
    use super::*;

    pub fn initialize_basket(
        ctx: Context<InitializeBasket>,
        name: String,
        basket_id: u64,
        constituents: Vec<Constituent>,
    ) -> Result<()> {
        require!(
            !constituents.is_empty(),
            BasketError::NoConstituents
        );

        require!(
            constituents.len() <= MAX_CONSTITUENTS,
            BasketError::TooManyConstituents
        );

        let total_weight: u32 = constituents
            .iter()
            .map(|c| c.weight_bps as u32)
            .sum();

        require!(
            total_weight == 10_000,
            BasketError::InvalidWeights
        );

        let basket = &mut ctx.accounts.basket;

        basket.creator =
            ctx.accounts.creator.key();

        basket.basket_id =
            basket_id;

        basket.basket_mint =
            ctx.accounts.basket_mint.key();

        basket.stablecoin_mint =
            ctx.accounts.stablecoin_mint.key();

        basket.stablecoin_vault =
            ctx.accounts.stablecoin_vault.key();

        basket.name =
            name;

        basket.constituents =
            constituents;

        basket.bump =
            ctx.bumps.basket;

        Ok(())
    }

    pub fn initialize_constituent_vault(
        ctx: Context<InitializeConstituentVault>,
        index: u8,
    ) -> Result<()> {
        let basket =
            &ctx.accounts.basket;

        let constituent_index =
            index as usize;

        require!(
            constituent_index
                < basket.constituents.len(),
            BasketError::InvalidConstituentIndex
        );

        let expected_mint =
            basket.constituents[
                constituent_index
            ]
            .mint;

        require_keys_eq!(
            ctx.accounts
                .constituent_mint
                .key(),
            expected_mint,
            BasketError::ConstituentMintMismatch
        );

        msg!(
            "Initialized constituent vault for index {}",
            index
        );

        msg!(
            "Constituent mint: {}",
            expected_mint
        );

        msg!(
            "Constituent vault: {}",
            ctx.accounts
                .constituent_vault
                .key()
        );

        Ok(())
    }

    pub fn prepare_constituent_swap(
        ctx: Context<PrepareConstituentSwap>,
        index: u8,
        input_amount: u64,
    ) -> Result<()> {
        require!(
            input_amount > 0,
            BasketError::InvalidSwapAmount
        );

        let basket =
            &ctx.accounts.basket;

        let constituent_index =
            index as usize;

        require!(
            constituent_index
                < basket.constituents.len(),
            BasketError::InvalidConstituentIndex
        );

        let constituent =
            &basket.constituents[
                constituent_index
            ];

        require_keys_eq!(
            ctx.accounts
                .constituent_mint
                .key(),
            constituent.mint,
            BasketError::ConstituentMintMismatch
        );

        let allocations =
            calculate_allocations(
                input_amount,
                &basket.constituents,
            )?;

        let target_amount =
            allocations[
                constituent_index
            ];

        msg!(
            "Prepared constituent swap"
        );

        msg!(
            "Constituent index: {}",
            index
        );

        msg!(
            "Input amount: {}",
            input_amount
        );

        msg!(
            "Constituent weight_bps: {}",
            constituent.weight_bps
        );

        msg!(
            "Target allocation amount: {}",
            target_amount
        );

        Ok(())
    }

    pub fn execute_constituent_swap(
        mut ctx: Context<ExecuteConstituentSwap>,
        index: u8,
        input_amount: u64,
        minimum_out: u64,
        jupiter_instruction_data: Vec<u8>,
    ) -> Result<()> {
        require!(
            input_amount > 0,
            BasketError::InvalidSwapAmount
        );

        require!(
            minimum_out > 0,
            BasketError::InvalidMinimumOut
        );

        require_keys_eq!(
            ctx.accounts
                .jupiter_program
                .key(),
            JUPITER_SWAP_PROGRAM_ID,
            BasketError::InvalidJupiterProgram
        );

        require!(
            is_allowed_jupiter_instruction(
                &jupiter_instruction_data
            ),
            BasketError::InvalidJupiterInstruction
        );

        let basket =
            &ctx.accounts.basket;

        let constituent_index =
            index as usize;

        require!(
            constituent_index
                < basket.constituents.len(),
            BasketError::InvalidConstituentIndex
        );

        let constituent =
            &basket.constituents[
                constituent_index
            ];

        require_keys_eq!(
            ctx.accounts
                .constituent_mint
                .key(),
            constituent.mint,
            BasketError::ConstituentMintMismatch
        );

        require!(
            ctx.accounts
                .stablecoin_vault
                .amount
                >= input_amount,
            BasketError::InsufficientStablecoinVaultBalance
        );

        let basket_key =
            basket.key();

        let basket_stablecoin_ata_key =
            ctx.accounts
                .basket_stablecoin_ata
                .key();

        let constituent_vault_key =
            ctx.accounts
                .constituent_vault
                .key();

        /*
         * Jupiter's raw swap instruction supplies
         * its complete ordered account list.
         *
         * The client passes that list into this
         * instruction as remaining_accounts.
         *
         * We require our critical protocol
         * accounts to actually be present.
         */

        let basket_present =
            ctx.remaining_accounts
                .iter()
                .any(
                    |account| {
                        *account.key
                            == basket_key
                    }
                );

        require!(
            basket_present,
            BasketError::MissingBasketAuthority
        );

        let basket_stablecoin_ata_present =
            ctx.remaining_accounts
                .iter()
                .any(
                    |account| {
                        *account.key
                            == basket_stablecoin_ata_key
                            && account.is_writable
                    }
                );

        require!(
            basket_stablecoin_ata_present,
            BasketError::MissingBasketStablecoinAta
        );

        let constituent_vault_present =
            ctx.remaining_accounts
                .iter()
                .any(
                    |account| {
                        *account.key
                            == constituent_vault_key
                            && account.is_writable
                    }
                );

        require!(
            constituent_vault_present,
            BasketError::MissingConstituentVault
        );

        let stablecoin_balance_before =
            ctx.accounts
                .stablecoin_vault
                .amount;

        let basket_stablecoin_ata_balance_before =
            ctx.accounts
                .basket_stablecoin_ata
                .amount;

        let constituent_balance_before =
            ctx.accounts
                .constituent_vault
                .amount;

        msg!(
            "Executing Jupiter CPI"
        );

        msg!(
            "Constituent index: {}",
            index
        );

        msg!(
            "Maximum input amount: {}",
            input_amount
        );

        msg!(
            "Minimum output amount: {}",
            minimum_out
        );

        msg!(
            "Stablecoin vault balance before: {}",
            stablecoin_balance_before
        );

        msg!(
            "Basket stablecoin ATA balance before: {}",
            basket_stablecoin_ata_balance_before
        );

        msg!(
            "Constituent balance before: {}",
            constituent_balance_before
        );

        /*
         * Build Jupiter account metas in exactly
         * the same order supplied by Jupiter.
         *
         * The Basket PDA is promoted to signer
         * for the inner CPI. invoke_signed()
         * supplies that signature.
         */

        let account_metas:
            Vec<AccountMeta> =
            ctx.remaining_accounts
                .iter()
                .map(
                    |account| {
                        let is_basket =
                            *account.key
                                == basket_key;

                        let is_signer =
                            account.is_signer
                                || is_basket;

                        if account.is_writable {
                            AccountMeta::new(
                                *account.key,
                                is_signer,
                            )
                        } else {
                            AccountMeta::new_readonly(
                                *account.key,
                                is_signer,
                            )
                        }
                    }
                )
                .collect();

        let account_infos =
            ctx.remaining_accounts
                .iter()
                .cloned()
                .collect::<Vec<_>>();

        let jupiter_instruction =
            Instruction {
                program_id:
                    JUPITER_SWAP_PROGRAM_ID,

                accounts:
                    account_metas,

                data:
                    jupiter_instruction_data,
            };

        let basket_id_bytes =
            basket
                .basket_id
                .to_le_bytes();

        let bump =
            [basket.bump];

        let signer_seeds:
            &[&[&[u8]]] =
            &[&[
                b"basket",
                basket.creator.as_ref(),
                &basket_id_bytes,
                &bump,
            ]];

        /*
         * Stocklana keeps deposited stablecoin in
         * its internal stablecoin vault.
         *
         * Jupiter expects the Basket PDA's normal
         * stablecoin token account as the swap
         * source, so stage only this swap's maximum
         * input there immediately before the CPI.
         */

        let stage_accounts =
            TransferChecked {
                from:
                    ctx.accounts
                        .stablecoin_vault
                        .to_account_info(),

                mint:
                    ctx.accounts
                        .stablecoin_mint
                        .to_account_info(),

                to:
                    ctx.accounts
                        .basket_stablecoin_ata
                        .to_account_info(),

                authority:
                    basket
                        .to_account_info(),
            };

        let stage_context =
            CpiContext::new(
                ctx.accounts
                    .token_program
                    .key(),
                stage_accounts,
            )
            .with_signer(
                signer_seeds
            );

        token_interface::transfer_checked(
            stage_context,
            input_amount,
            ctx.accounts
                .stablecoin_mint
                .decimals,
        )?;

        invoke_signed(
            &jupiter_instruction,
            &account_infos,
            signer_seeds,
        )?;

        /*
         * Jupiter CPI has returned successfully.
         *
         * Reload the Jupiter source and destination
         * accounts before measuring the swap.
         */

        ctx.accounts
            .basket_stablecoin_ata
            .reload()?;

        ctx.accounts
            .constituent_vault
            .reload()?;

        let basket_stablecoin_ata_balance_after_swap =
            ctx.accounts
                .basket_stablecoin_ata
                .amount;

        let constituent_balance_after =
            ctx.accounts
                .constituent_vault
                .amount;

        let staged_source_balance =
            basket_stablecoin_ata_balance_before
                .checked_add(
                    input_amount
                )
                .ok_or(
                    BasketError::MathOverflow
                )?;

        require!(
            basket_stablecoin_ata_balance_after_swap
                <= staged_source_balance,
            BasketError::InvalidBasketStablecoinAtaBalance
        );

        let spent_amount =
            staged_source_balance
                .checked_sub(
                    basket_stablecoin_ata_balance_after_swap
                )
                .ok_or(
                    BasketError::MathOverflow
                )?;

        require!(
            spent_amount > 0,
            BasketError::ZeroSwapInputSpent
        );

        require!(
            spent_amount <= input_amount,
            BasketError::SwapSpentTooMuch
        );

        let received_amount =
            constituent_balance_after
                .checked_sub(
                    constituent_balance_before
                )
                .ok_or(
                    BasketError::MathOverflow
                )?;

        require!(
            constituent_balance_after
                >= constituent_balance_before,
            BasketError::InvalidConstituentBalanceChange
        );

        /*
         * If Jupiter used less than the staged
         * maximum input, return the unused amount
         * to Stocklana's internal stablecoin vault.
         */

        let unused_amount =
            input_amount
                .checked_sub(
                    spent_amount
                )
                .ok_or(
                    BasketError::MathOverflow
                )?;

        if unused_amount > 0 {
            let refund_accounts =
                TransferChecked {
                    from:
                        ctx.accounts
                            .basket_stablecoin_ata
                            .to_account_info(),

                    mint:
                        ctx.accounts
                            .stablecoin_mint
                            .to_account_info(),

                    to:
                        ctx.accounts
                            .stablecoin_vault
                            .to_account_info(),

                    authority:
                        basket
                            .to_account_info(),
                };

            let refund_context =
                CpiContext::new(
                    ctx.accounts
                        .token_program
                        .key(),
                    refund_accounts,
                )
                .with_signer(
                    signer_seeds
                );

            token_interface::transfer_checked(
                refund_context,
                unused_amount,
                ctx.accounts
                    .stablecoin_mint
                    .decimals,
            )?;
        }

        ctx.accounts
            .stablecoin_vault
            .reload()?;

        ctx.accounts
            .basket_stablecoin_ata
            .reload()?;

        let stablecoin_balance_after =
            ctx.accounts
                .stablecoin_vault
                .amount;

        let basket_stablecoin_ata_balance_final =
            ctx.accounts
                .basket_stablecoin_ata
                .amount;

        let expected_stablecoin_balance_after =
            stablecoin_balance_before
                .checked_sub(
                    spent_amount
                )
                .ok_or(
                    BasketError::MathOverflow
                )?;

        require!(
            stablecoin_balance_after
                == expected_stablecoin_balance_after,
            BasketError::InvalidStablecoinBalanceChange
        );

        require!(
            basket_stablecoin_ata_balance_final
                == basket_stablecoin_ata_balance_before,
            BasketError::InvalidBasketStablecoinAtaBalance
        );

        /*
         * On-chain minimum-out protection.
         *
         * If Jupiter delivers less than this,
         * the full Solana transaction reverts.
         */

        require!(
            received_amount
                >= minimum_out,
            BasketError::MinimumOutNotMet
        );

        msg!(
            "Jupiter CPI succeeded"
        );

        msg!(
            "Stablecoin spent: {}",
            spent_amount
        );

        msg!(
            "Unused stablecoin returned: {}",
            unused_amount
        );

        msg!(
            "Constituent received: {}",
            received_amount
        );

        Ok(())
    }

    pub fn preview_allocations(
        ctx: Context<PreviewAllocations>,
        amount: u64,
    ) -> Result<()> {
        require!(
            amount > 0,
            BasketError::InvalidPreviewAmount
        );

        let allocations =
            calculate_allocations(
                amount,
                &ctx.accounts
                    .basket
                    .constituents,
            )?;

        msg!(
            "Preview amount: {}",
            amount
        );

        for (
            index,
            constituent,
        ) in ctx.accounts
            .basket
            .constituents
            .iter()
            .enumerate()
        {
            msg!(
                "Constituent {} mint: {}",
                index,
                constituent.mint
            );

            msg!(
                "Constituent {} weight_bps: {}",
                index,
                constituent.weight_bps
            );

            msg!(
                "Constituent {} target_amount: {}",
                index,
                allocations[index]
            );
        }

        Ok(())
    }

    pub fn deposit_and_mint(
        ctx: Context<DepositAndMint>,
        deposit_amount: u64,
    ) -> Result<()> {
        require!(
            deposit_amount > 0,
            BasketError::InvalidDepositAmount
        );

        require!(
            ctx.accounts
                .stablecoin_mint
                .decimals
                == ctx.accounts
                    .basket_mint
                    .decimals,
            BasketError::DecimalMismatch
        );

        let share_amount =
            deposit_amount;

        let allocations =
            calculate_allocations(
                deposit_amount,
                &ctx.accounts
                    .basket
                    .constituents,
            )?;

        for (
            index,
            amount,
        ) in allocations
            .iter()
            .enumerate()
        {
            msg!(
                "Constituent {} allocation: {}",
                index,
                amount
            );
        }

        let transfer_accounts =
            TransferChecked {
                from:
                    ctx.accounts
                        .user_stablecoin_account
                        .to_account_info(),

                mint:
                    ctx.accounts
                        .stablecoin_mint
                        .to_account_info(),

                to:
                    ctx.accounts
                        .stablecoin_vault
                        .to_account_info(),

                authority:
                    ctx.accounts
                        .user
                        .to_account_info(),
            };

        let transfer_context =
            CpiContext::new(
                ctx.accounts
                    .token_program
                    .key(),
                transfer_accounts,
            );

        token_interface::transfer_checked(
            transfer_context,
            deposit_amount,
            ctx.accounts
                .stablecoin_mint
                .decimals,
        )?;

        let basket =
            &ctx.accounts.basket;

        let basket_id_bytes =
            basket
                .basket_id
                .to_le_bytes();

        let bump =
            [basket.bump];

        let signer_seeds:
            &[&[&[u8]]] =
            &[&[
                b"basket",
                basket.creator.as_ref(),
                &basket_id_bytes,
                &bump,
            ]];

        let mint_accounts =
            MintTo {
                mint:
                    ctx.accounts
                        .basket_mint
                        .to_account_info(),

                to:
                    ctx.accounts
                        .user_basket_token_account
                        .to_account_info(),

                authority:
                    basket
                        .to_account_info(),
            };

        let mint_context =
            CpiContext::new(
                ctx.accounts
                    .token_program
                    .key(),
                mint_accounts,
            )
            .with_signer(
                signer_seeds
            );

        token_interface::mint_to(
            mint_context,
            share_amount,
        )?;

        Ok(())
    }

    pub fn redeem_and_withdraw(
        ctx: Context<RedeemAndWithdraw>,
        share_amount: u64,
    ) -> Result<()> {
        require!(
            share_amount > 0,
            BasketError::InvalidRedeemAmount
        );

        require!(
            ctx.accounts
                .stablecoin_mint
                .decimals
                == ctx.accounts
                    .basket_mint
                    .decimals,
            BasketError::DecimalMismatch
        );

        let stablecoin_amount =
            share_amount;

        let burn_accounts =
            Burn {
                mint:
                    ctx.accounts
                        .basket_mint
                        .to_account_info(),

                from:
                    ctx.accounts
                        .user_basket_token_account
                        .to_account_info(),

                authority:
                    ctx.accounts
                        .user
                        .to_account_info(),
            };

        let burn_context =
            CpiContext::new(
                ctx.accounts
                    .token_program
                    .key(),
                burn_accounts,
            );

        token_interface::burn(
            burn_context,
            share_amount,
        )?;

        let basket =
            &ctx.accounts.basket;

        let basket_id_bytes =
            basket
                .basket_id
                .to_le_bytes();

        let bump =
            [basket.bump];

        let signer_seeds:
            &[&[&[u8]]] =
            &[&[
                b"basket",
                basket.creator.as_ref(),
                &basket_id_bytes,
                &bump,
            ]];

        let transfer_accounts =
            TransferChecked {
                from:
                    ctx.accounts
                        .stablecoin_vault
                        .to_account_info(),

                mint:
                    ctx.accounts
                        .stablecoin_mint
                        .to_account_info(),

                to:
                    ctx.accounts
                        .user_stablecoin_account
                        .to_account_info(),

                authority:
                    basket
                        .to_account_info(),
            };

        let transfer_context =
            CpiContext::new(
                ctx.accounts
                    .token_program
                    .key(),
                transfer_accounts,
            )
            .with_signer(
                signer_seeds
            );

        token_interface::transfer_checked(
            transfer_context,
            stablecoin_amount,
            ctx.accounts
                .stablecoin_mint
                .decimals,
        )?;

        Ok(())
    }
}

pub fn calculate_allocations(
    deposit_amount: u64,
    constituents: &[Constituent],
) -> Result<Vec<u64>> {
    require!(
        !constituents.is_empty(),
        BasketError::NoConstituents
    );

    let mut allocations =
        Vec::with_capacity(
            constituents.len()
        );

    let mut allocated_total: u64 =
        0;

    for (
        index,
        constituent,
    ) in constituents
        .iter()
        .enumerate()
    {
        let amount =
            if index
                == constituents.len() - 1
            {
                deposit_amount
                    .checked_sub(
                        allocated_total
                    )
                    .ok_or(
                        BasketError::MathOverflow
                    )?
            } else {
                deposit_amount
                    .checked_mul(
                        constituent
                            .weight_bps
                            as u64
                    )
                    .ok_or(
                        BasketError::MathOverflow
                    )?
                    .checked_div(
                        BASIS_POINTS_DENOMINATOR
                    )
                    .ok_or(
                        BasketError::MathOverflow
                    )?
            };

        allocated_total =
            allocated_total
                .checked_add(
                    amount
                )
                .ok_or(
                    BasketError::MathOverflow
                )?;

        allocations.push(
            amount
        );
    }

    Ok(allocations)
}

fn is_allowed_jupiter_instruction(
    data: &[u8],
) -> bool {
    if data.len() < 8 {
        return false;
    }

    let discriminator =
        &data[..8];

    discriminator
        == JUPITER_ROUTE_DISCRIMINATOR
        || discriminator
            == JUPITER_SHARED_ACCOUNTS_ROUTE_DISCRIMINATOR
}

#[derive(Accounts)]
#[instruction(
    name: String,
    basket_id: u64
)]
pub struct InitializeBasket<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Basket::INIT_SPACE,
        seeds = [
            b"basket",
            creator.key().as_ref(),
            &basket_id.to_le_bytes()
        ],
        bump
    )]
    pub basket:
        Account<'info, Basket>,

    #[account(
        init,
        payer = creator,
        seeds = [
            b"basket_mint",
            basket.key().as_ref()
        ],
        bump,
        mint::decimals = 6,
        mint::authority = basket,
        mint::token_program = token_program
    )]
    pub basket_mint:
        InterfaceAccount<'info, Mint>,

    pub stablecoin_mint:
        InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = creator,
        seeds = [
            b"stablecoin_vault",
            basket.key().as_ref()
        ],
        bump,
        token::mint = stablecoin_mint,
        token::authority = basket,
        token::token_program = token_program
    )]
    pub stablecoin_vault:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    #[account(mut)]
    pub creator:
        Signer<'info>,

    pub token_program:
        Interface<
            'info,
            TokenInterface
        >,

    pub system_program:
        Program<
            'info,
            System
        >,
}

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct InitializeConstituentVault<'info> {
    #[account(
        seeds = [
            b"basket",
            basket.creator.as_ref(),
            &basket.basket_id.to_le_bytes()
        ],
        bump = basket.bump
    )]
    pub basket:
        Account<'info, Basket>,

    pub constituent_mint:
        InterfaceAccount<
            'info,
            Mint
        >,

    #[account(
        init,
        payer = payer,
        seeds = [
            b"constituent_vault",
            basket.key().as_ref(),
            &[index]
        ],
        bump,
        token::mint = constituent_mint,
        token::authority = basket,
        token::token_program = token_program
    )]
    pub constituent_vault:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    #[account(mut)]
    pub payer:
        Signer<'info>,

    pub token_program:
        Interface<
            'info,
            TokenInterface
        >,

    pub system_program:
        Program<
            'info,
            System
        >,
}

#[derive(Accounts)]
#[instruction(
    index: u8,
    input_amount: u64
)]
pub struct PrepareConstituentSwap<'info> {
    #[account(
        seeds = [
            b"basket",
            basket.creator.as_ref(),
            &basket.basket_id.to_le_bytes()
        ],
        bump = basket.bump,
        has_one = stablecoin_mint,
        has_one = stablecoin_vault
    )]
    pub basket:
        Account<'info, Basket>,

    pub stablecoin_mint:
        InterfaceAccount<
            'info,
            Mint
        >,

    #[account(
        token::mint = stablecoin_mint,
        token::authority = basket,
        token::token_program = token_program
    )]
    pub stablecoin_vault:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    pub constituent_mint:
        InterfaceAccount<
            'info,
            Mint
        >,

    #[account(
        seeds = [
            b"constituent_vault",
            basket.key().as_ref(),
            &[index]
        ],
        bump,
        token::mint = constituent_mint,
        token::authority = basket,
        token::token_program = token_program
    )]
    pub constituent_vault:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    pub token_program:
        Interface<
            'info,
            TokenInterface
        >,
}

#[derive(Accounts)]
#[instruction(
    index: u8,
    input_amount: u64,
    minimum_out: u64,
    jupiter_instruction_data: Vec<u8>
)]
pub struct ExecuteConstituentSwap<'info> {
    #[account(
        seeds = [
            b"basket",
            basket.creator.as_ref(),
            &basket.basket_id.to_le_bytes()
        ],
        bump = basket.bump,
        has_one = stablecoin_mint,
        has_one = stablecoin_vault
    )]
    pub basket:
        Account<'info, Basket>,

    pub stablecoin_mint:
        InterfaceAccount<
            'info,
            Mint
        >,

    #[account(
        mut,
        token::mint = stablecoin_mint,
        token::authority = basket,
        token::token_program = token_program
    )]
    pub stablecoin_vault:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    #[account(
        mut,
        token::mint = stablecoin_mint,
        token::authority = basket,
        token::token_program = token_program
    )]
    pub basket_stablecoin_ata:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    pub constituent_mint:
        InterfaceAccount<
            'info,
            Mint
        >,

    #[account(
        mut,
        seeds = [
            b"constituent_vault",
            basket.key().as_ref(),
            &[index]
        ],
        bump,
        token::mint = constituent_mint,
        token::authority = basket,
        token::token_program = token_program
    )]
    pub constituent_vault:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    /// CHECK:
    /// Must exactly equal the hardcoded
    /// Jupiter Swap program ID.
    pub jupiter_program:
        UncheckedAccount<'info>,

    pub token_program:
        Interface<
            'info,
            TokenInterface
        >,
}

#[derive(Accounts)]
pub struct PreviewAllocations<'info> {
    #[account(
        seeds = [
            b"basket",
            basket.creator.as_ref(),
            &basket.basket_id.to_le_bytes()
        ],
        bump = basket.bump
    )]
    pub basket:
        Account<'info, Basket>,
}

#[derive(Accounts)]
pub struct DepositAndMint<'info> {
    #[account(
        seeds = [
            b"basket",
            basket.creator.as_ref(),
            &basket.basket_id.to_le_bytes()
        ],
        bump = basket.bump,
        has_one = basket_mint,
        has_one = stablecoin_mint,
        has_one = stablecoin_vault
    )]
    pub basket:
        Account<'info, Basket>,

    #[account(mut)]
    pub basket_mint:
        InterfaceAccount<
            'info,
            Mint
        >,

    pub stablecoin_mint:
        InterfaceAccount<
            'info,
            Mint
        >,

    #[account(
        mut,
        token::mint = stablecoin_mint,
        token::authority = user,
        token::token_program = token_program
    )]
    pub user_stablecoin_account:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    #[account(
        mut,
        token::mint = stablecoin_mint,
        token::authority = basket,
        token::token_program = token_program
    )]
    pub stablecoin_vault:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    #[account(
        mut,
        token::mint = basket_mint,
        token::authority = user,
        token::token_program = token_program
    )]
    pub user_basket_token_account:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    pub user:
        Signer<'info>,

    pub token_program:
        Interface<
            'info,
            TokenInterface
        >,
}

#[derive(Accounts)]
pub struct RedeemAndWithdraw<'info> {
    #[account(
        seeds = [
            b"basket",
            basket.creator.as_ref(),
            &basket.basket_id.to_le_bytes()
        ],
        bump = basket.bump,
        has_one = basket_mint,
        has_one = stablecoin_mint,
        has_one = stablecoin_vault
    )]
    pub basket:
        Account<'info, Basket>,

    #[account(mut)]
    pub basket_mint:
        InterfaceAccount<
            'info,
            Mint
        >,

    pub stablecoin_mint:
        InterfaceAccount<
            'info,
            Mint
        >,

    #[account(
        mut,
        token::mint = basket_mint,
        token::authority = user,
        token::token_program = token_program
    )]
    pub user_basket_token_account:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    #[account(
        mut,
        token::mint = stablecoin_mint,
        token::authority = basket,
        token::token_program = token_program
    )]
    pub stablecoin_vault:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    #[account(
        mut,
        token::mint = stablecoin_mint,
        token::authority = user,
        token::token_program = token_program
    )]
    pub user_stablecoin_account:
        InterfaceAccount<
            'info,
            TokenAccount
        >,

    pub user:
        Signer<'info>,

    pub token_program:
        Interface<
            'info,
            TokenInterface
        >,
}

#[account]
#[derive(InitSpace)]
pub struct Basket {
    pub creator:
        Pubkey,

    pub basket_id:
        u64,

    pub basket_mint:
        Pubkey,

    pub stablecoin_mint:
        Pubkey,

    pub stablecoin_vault:
        Pubkey,

    #[max_len(64)]
    pub name:
        String,

    #[max_len(10)]
    pub constituents:
        Vec<Constituent>,

    pub bump:
        u8,
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    InitSpace
)]
pub struct Constituent {
    pub mint:
        Pubkey,

    pub weight_bps:
        u16,
}

#[error_code]
pub enum BasketError {
    #[msg(
        "Basket must contain at least one constituent."
    )]
    NoConstituents,

    #[msg(
        "Basket cannot contain more than 10 constituents."
    )]
    TooManyConstituents,

    #[msg(
        "Constituent weights must add up to 10,000 basis points."
    )]
    InvalidWeights,

    #[msg(
        "Deposit amount must be greater than zero."
    )]
    InvalidDepositAmount,

    #[msg(
        "Preview amount must be greater than zero."
    )]
    InvalidPreviewAmount,

    #[msg(
        "Redeem amount must be greater than zero."
    )]
    InvalidRedeemAmount,

    #[msg(
        "Swap input amount must be greater than zero."
    )]
    InvalidSwapAmount,

    #[msg(
        "Minimum swap output must be greater than zero."
    )]
    InvalidMinimumOut,

    #[msg(
        "Stablecoin and basket mint decimals must match."
    )]
    DecimalMismatch,

    #[msg(
        "Arithmetic overflow while calculating basket allocations."
    )]
    MathOverflow,

    #[msg(
        "Constituent index is outside the basket."
    )]
    InvalidConstituentIndex,

    #[msg(
        "Provided constituent mint does not match the basket."
    )]
    ConstituentMintMismatch,

    #[msg(
        "Provided Jupiter program is not the approved Jupiter Swap program."
    )]
    InvalidJupiterProgram,

    #[msg(
        "Stablecoin vault does not contain enough funds for the requested swap."
    )]
    InsufficientStablecoinVaultBalance,

    #[msg(
        "Jupiter instruction type is not allowed."
    )]
    InvalidJupiterInstruction,

    #[msg(
        "Jupiter account list does not contain the basket authority."
    )]
    MissingBasketAuthority,

    #[msg(
        "Jupiter account list does not contain the writable stablecoin vault."
    )]
    MissingStablecoinVault,

    #[msg(
        "Jupiter account list does not contain the writable constituent vault."
    )]
    MissingConstituentVault,

    #[msg(
        "Stablecoin vault balance changed in an invalid direction."
    )]
    InvalidStablecoinBalanceChange,

    #[msg(
        "Constituent vault balance changed in an invalid direction."
    )]
    InvalidConstituentBalanceChange,

    #[msg(
        "Jupiter swap spent zero input tokens."
    )]
    ZeroSwapInputSpent,

    #[msg(
        "Jupiter swap spent more stablecoin than the approved input amount."
    )]
    SwapSpentTooMuch,

    #[msg(
        "Jupiter swap output was below the required minimum."
    )]
    MinimumOutNotMet,

    #[msg(
        "Jupiter account list does not contain the writable Basket stablecoin ATA."
    )]
    MissingBasketStablecoinAta,

    #[msg(
        "Basket stablecoin ATA balance changed unexpectedly."
    )]
    InvalidBasketStablecoinAtaBalance,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn calculates_weighted_allocations_correctly() {
        let constituents =
            vec![
                Constituent {
                    mint:
                        Pubkey::new_unique(),
                    weight_bps:
                        4000,
                },
                Constituent {
                    mint:
                        Pubkey::new_unique(),
                    weight_bps:
                        2500,
                },
                Constituent {
                    mint:
                        Pubkey::new_unique(),
                    weight_bps:
                        2000,
                },
                Constituent {
                    mint:
                        Pubkey::new_unique(),
                    weight_bps:
                        1500,
                },
            ];

        let deposit_amount =
            5_000_000;

        let allocations =
            calculate_allocations(
                deposit_amount,
                &constituents,
            )
            .unwrap();

        assert_eq!(
            allocations,
            vec![
                2_000_000,
                1_250_000,
                1_000_000,
                750_000,
            ]
        );

        let total: u64 =
            allocations
                .iter()
                .sum();

        assert_eq!(
            total,
            deposit_amount
        );
    }

    #[test]
    fn assigns_rounding_remainder_to_last_constituent() {
        let constituents =
            vec![
                Constituent {
                    mint:
                        Pubkey::new_unique(),
                    weight_bps:
                        3333,
                },
                Constituent {
                    mint:
                        Pubkey::new_unique(),
                    weight_bps:
                        3333,
                },
                Constituent {
                    mint:
                        Pubkey::new_unique(),
                    weight_bps:
                        3334,
                },
            ];

        let deposit_amount =
            100;

        let allocations =
            calculate_allocations(
                deposit_amount,
                &constituents,
            )
            .unwrap();

        assert_eq!(
            allocations,
            vec![
                33,
                33,
                34,
            ]
        );

        let total: u64 =
            allocations
                .iter()
                .sum();

        assert_eq!(
            total,
            deposit_amount
        );
    }

    #[test]
    fn accepts_jupiter_route_discriminator() {
        let mut data =
            Vec::from(
                JUPITER_ROUTE_DISCRIMINATOR
            );

        data.extend_from_slice(
            &[1, 2, 3]
        );

        assert!(
            is_allowed_jupiter_instruction(
                &data
            )
        );
    }

    #[test]
    fn accepts_jupiter_shared_accounts_route_discriminator() {
        let mut data =
            Vec::from(
                JUPITER_SHARED_ACCOUNTS_ROUTE_DISCRIMINATOR
            );

        data.extend_from_slice(
            &[1, 2, 3]
        );

        assert!(
            is_allowed_jupiter_instruction(
                &data
            )
        );
    }

    #[test]
    fn rejects_unknown_jupiter_instruction() {
        let data =
            vec![
                0,
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
            ];

        assert!(
            !is_allowed_jupiter_instruction(
                &data
            )
        );
    }
}