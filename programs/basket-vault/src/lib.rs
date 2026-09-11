use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod basket_vault {
    use super::*;

    pub fn initialize_basket(
        ctx: Context<InitializeBasket>,
        name: String,
    ) -> Result<()> {
        let basket = &mut ctx.accounts.basket;

        basket.creator = ctx.accounts.creator.key();
        basket.name = name;
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

    pub bump: u8,
}
