let 
  holonixPath = builtins.fetchTarball {
    url = "https://github.com/holochain/holonix/archive/cdf1d199d5489ebc943b88e552507f1063e3e571.tar.gz";
    sha256 = "1b5pdlxj91syg1qqf42f49sxlq9qd3qnz7ccgdncjvhdfyricagh";
  };
  holonix = import (holonixPath) {
    includeHolochainBinaries = true;
    holochainVersionId = "custom";
    
    holochainVersion = { 
     rev = "24477159cd80f3a44fd82bba60baa360e76b9f0d";  
     sha256 = "1qiypsr37v5m1sqbz2mnlwfrnksds88ag8m78fjwszsh6nx1yhgz";  
     cargoSha256 = "0q9nl0wqvyd5jbxq92f1h4l7i439kl5j1bkzxlz929q4m43r3apn";
     bins = {
       holochain = "holochain";
       hc = "hc";
     };
    };
    holochainOtherDepsNames = ["lair-keystore"];
  };
in holonix.main
