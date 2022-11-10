export const pool_seed = get_seeds("pool_seed_09")
export const token_pool_seed = get_seeds("token_pool09")
export const pool_owner_seed = get_seeds("pool_owner")

function get_seeds(seed_str: any) {
    return [...seed_str].map((char) => char.codePointAt())
}