use sedaro_nano_queries::{grammar, Query};
use serde::Serialize;
use std::io::{read_to_string, stdin};

fn main() {
    let s =
        read_to_string(stdin()).unwrap_or_else(|err| panic!("Could not read input stream! {err}"));
    let parser = grammar::QueryParser::new();
    let query = parser
        .parse(&s)
        .unwrap_or_else(|err| panic!("Could not parse input! {err}"));
    print!("{}", query.serialize(serde_json::value::Serializer).unwrap())
}
