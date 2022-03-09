let
  hash_nix = "46297548fd8db19bec228171a524330e7b5f6744";
  holonixPath = builtins.fetchTarball "https://github.com/holochain/holonix/archive/${hash_nix}.tar.gz";
  holonix = import (holonixPath) {
    holochainVersionId = "v0_0_124";
  };
  nixpkgs = holonix.pkgs;
in nixpkgs.mkShell {
  inputsFrom = [ holonix.main ];
  packages = with nixpkgs; [
    # additional packages go here
    nodejs-16_x
  ];
}