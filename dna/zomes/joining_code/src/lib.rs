use hdk::prelude::*;
use hc_joining_code;

entry_defs![Path::entry_def()];

#[hdk_extern]
fn init(_: ()) -> ExternResult<InitCallbackResult> {
    return hc_joining_code::init_validate_and_create_joining_code();
}

#[hdk_extern]
fn genesis_self_check(data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
    hc_joining_code::validate_joining_code( data.agent_key, data.membrane_proof)
}

#[hdk_extern]
fn validate_create_agent(data: ValidateData) -> ExternResult<ValidateCallbackResult> {
    let element = data.element.clone();
    let entry = element.entry();
    let entry = match entry {
        ElementEntry::Present(e) => e,
        _ => return Ok(ValidateCallbackResult::Valid),
    };
    if let Entry::Agent(_) = entry {
        if !hc_joining_code::skip_proof() {
            match data.element.header().prev_header() {
                Some(header) => match get(header.clone(), GetOptions::default()) {
                    Ok(element_pkg) => match element_pkg {
                        Some(element_pkg) => match element_pkg.signed_header().header() {
                            Header::AgentValidationPkg(pkg) => {
                                return hc_joining_code::validate_joining_code(
                                    pkg.author.clone(),
                                    pkg.membrane_proof.clone(),
                                )
                            }
                            _ => {
                                return Ok(ValidateCallbackResult::Invalid(
                                    "No Agent Validation Pkg found".to_string(),
                                ))
                            }
                        },
                        None => {
                            return Ok(ValidateCallbackResult::UnresolvedDependencies(vec![
                                (header.clone()).into(),
                            ]))
                        }
                    },
                    Err(e) => {
                        debug!("Error on get when validating agent entry: {:?}; treating as unresolved dependency",e);
                        return Ok(ValidateCallbackResult::UnresolvedDependencies(vec![
                            (header.clone()).into(),
                        ]));
                    }
                },
                None => unreachable!("This element will always have a prev_header"),
            }
        }
    }

    unreachable!("validate_create_agent called with an element that wasn't creating an agent")
}