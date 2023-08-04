jq_update_script='                                                                                             
if has($old_param) then
    .[$new_param] = .[$old_param] | del(.[$old_param])
else
   .
end
'
jq_add_script='
  if has($new_param) | not then
    # Fetch the default value from the saved file
    # If the default value exists, add it as the new parameter
    .[$new_param] = $def_val
  else
    # If only the new parameter exists, keep it as is
    .
  end
'

declare -A param_mapping=(
              ["evm-network-id"]="network-id chain-id"
              ["price-multiplier"]="base-multiplier"
              #add more configs as needed
            )
            
            ### update configs ###
            # Iterate over the mapping and perform updates using sed
            for new_param in "${!param_mapping[@]}"
            do
              old_params="${param_mapping[$new_param]}"
              for old_param in $old_params
              do
                def_val=$(jq -r ".[\"$new_param\"]" default.json)
                jq --arg old_param "$old_param" --arg new_param "$new_param" --arg def_val "$def_val" "$jq_add_script" ubiquibot-config-default.json > ubiquibot-config-default
                mv ubiquibot-config-default ubiquibot-config-default.json
                jq --arg old_param "$old_param" --arg new_param "$new_param" "$jq_update_script" ubiquibot-config-default.json > ubiquibot-config-default
                mv ubiquibot-config-default ubiquibot-config-default.json
              done
            done