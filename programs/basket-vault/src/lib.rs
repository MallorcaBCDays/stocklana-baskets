use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod basket_vault {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("Basket Vault initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
