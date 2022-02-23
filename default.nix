let
  hash_nix = "843c86d5871df8de2d9a02bdd797ad6f33fa5be5";
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