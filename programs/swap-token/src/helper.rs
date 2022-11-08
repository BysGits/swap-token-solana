use core::panic;

pub fn how_much_to_get(option: u8, amount: u64, rate: u64) -> u64 {
    match option {
        1 => amount / rate,
        2 => amount * rate,
        _ => panic!("Unknown value")
    }
}
