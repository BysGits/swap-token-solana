use core::panic;

pub fn how_much_to_get(option: u8, amount: u64, rate: u64) -> u64 {
    match option {
        1 => amount / rate,
        2 => amount * rate,
        _ => panic!("Unknown value")
    }
}

pub fn to_bytes(input: u64) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(8);

    bytes.extend(input.to_be_bytes());

    bytes
}

pub fn get_message_bytes(bumpy: u8, option: u8, amount: u64, tx_id: String) -> Vec<u8> {
    let mut message = Vec::new();
    message.push(bumpy);
    message.push(option);
    let amount_bytes = &mut to_bytes(amount);
    message.append(amount_bytes);
    let tx_id_bytes = &mut tx_id.into_bytes();
    message.append(tx_id_bytes);

    message
}
