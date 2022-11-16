export const pool_seed = get_seeds("pool_seed_24")
export const token_pool_seed = get_seeds("token_pool24")
export const pool_owner_seed = get_seeds("pool_owner")
export const tx_id_01 = "0x00003"
export const tx_id_02 = "0x00004"

function get_seeds(seed_str: any) {
    return [...seed_str].map((char) => char.codePointAt())
}