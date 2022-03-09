# Elemental Chess

## nix-shell setup

At first, run from the root folder of this repository to enter the nix-shell:

```bash
nix-shell
```

**You need to be inside this nix-shell to run any of the instructions below.**

From the root folder of the repo:

```bash
npm install
```

## Testing

```bash
npm test
```

## Starting a Holochain network

```bash
npm run network 2
```

You can replace "2" by the number of agents that you want to boot up

## Starting with Holo's HCC mode

```bash
npm run network:holo
```

Go to the 2 pages that opens, and login with any email and password.

## Upgrading the Holochain version

Do the following steps for all these repositories:

- [@holochain-open-dev/profiles](https://github.com/holochain-open-dev/profiles)
- [@eyss/invitations](https://github.com/eyss/invitations)
- [@eyss/elo](https://github.com/eyss/elo)
- [@eyss/turn-based-game](https://github.com/eyss/turn-based-game)

1. [Upgrade the default.nix for this package to the latest holochain version](https://github.com/holochain-open-dev/wiki/wiki/How-to-upgrade-the-Holochain-version-of-a-project-with-Nix#upgrading-to-the-latest-holochain-release).
2. Change the version of the `Cargo.toml` to the [latest hdk version](https://crates.io/crates/hdk).
3. Commit the newer versions, and copy the hash of the commit.

And then in **this** repository, do this:
1. [Upgrade the default.nix for this package to the latest holochain version](https://github.com/holochain-open-dev/wiki/wiki/How-to-upgrade-the-Holochain-version-of-a-project-with-Nix#upgrading-to-the-latest-holochain-release).
2. Change the version of the `Cargo.toml` to the [latest hdk version](https://crates.io/crates/hdk).
3. Replace the hash for the dependencies to the newer one.
4. Run `npm run network 2` and check that everything works correctly.
5. Run `npm run network:holo` and check that everything works correctly.
6. Package elemental-chess for a new release, by executing the steps in the following section.


## Packaging for release

```bash
npm run package
```

At this point, you will have the application bundled in `workdir`, both the `.webhapp` for the launcher and the `.happ` and the UI `.zip` for Holo.
