use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

const MAX_CONSTITUENTS: usize = 10;

#[program]
pub mod basket_vault {
    use super::*;

    pub fn initialize_basket(
        ctx: Context<InitializeBasket>,
        name: String,
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

        let total_weight: u16 = constituents
            .iter()
            .map(|c| c.weight_bps)
            .sum();

        require!(
            total_weight == 10_000,
            BasketError::InvalidWeights
        );

        let basket = &mut ctx.accounts.basket;

        basket.creator = ctx.accounts.creator.key();
        basket.name = name;
        basket.constituents = constituents;
        basket.bump = ctx.bumps.basket;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeBasket<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Basket::INIT_SPACE,
        seeds = [b"basket", creator.key().as_ref()],
        bump
    )]
    pub basket: Account<'info, Basket>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Basket {
    pub creator: Pubkey,

    #[max_len(64)]
    pub name: String,

    #[max_len(10)]
    pub constituents: Vec<Constituent>,

    pub bump: u8,
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    InitSpace
)]
pub struct Constituent {
    pub mint: Pubkey,
    pub weight_bps: u16,
}

#[error_code]
pub enum BasketError {
    #[msg("Basket must contain at least one constituent.")]
    NoConstituents,

    #[msg("Basket cannot contain more than 10 constituents.")]
    TooManyConstituents,

    #[msg("Constituent weights must add up to 10,000 basis points.")]
    InvalidWeights,
}
