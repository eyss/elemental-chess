# Create a fresh conductor using hc:
### this commands needs to be executed always from the nix-shell  


for more detailed information you always can use --help flag and find more options 

* to create a totally empty sandbox you need to execute: 

    `hc sandbox create --root path_where_you_want_store_the_conductor`
this will create the empty sandbox in the especific dir and 



## to install a happ for an especific agent you canexcute this command: 

in order to install an happ to an especific agent, you need first have created an agent, you can do it with this command 

```bash
hc s call new-agent

hc s call install-app-bundle happ_bundle_path --app-id your_happ_id --agent-key specific_agent_key 

hc s call add-app-ws 8888
```