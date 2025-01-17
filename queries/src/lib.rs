use lalrpop_util::lalrpop_mod;
use serde::{Deserialize, Serialize};

lalrpop_mod!(pub grammar);

#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(tag = "kind", content="content")]
pub enum Query {
    Prev(Box<Query>),
    Root,
    Agent(String),
    Access { base: Box<Query>, field: String },
    Base(String),
    Tuple(Vec<Query>),
}
