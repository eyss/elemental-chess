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

## Packaging for release

```bash
npm run package
```

At this point, you will have the application bundled in `workdir`, both the `.webhapp` for the launcher and the `.happ` and the UI `.zip` for Holo.
