# Elemental Chess

## nix-shell setup

At first, run from the root folder of this repository to enter the nix-shell:

```bash
nix-shell
```

**You need to be inside this nix-shell to run any of the instructions below.**

## Building the DNA

```bash
cd dna
CARGO_TARGET_DIR=target cargo build --release --target wasm32-unknown-unknown
hc dna pack workdir/dna
hc app pack workdir/happ
```

## Starting the UI

Enter the UI folder:

```bash
cd ui
```

If you haven't yet:

```bash
npm install
```

Then, run this inside the nix-shell in one terminal:

```bash
npm run start-alice
```

And this in another terminal inside the nix-shell as well:

```bash
npm run start-bob
```

If a page with "Not found" appears, wait for the UI to finish compilation and refresh the page.

## Starting with Holo's HCC mode

```bash
npm run start-holo
```

Go to the page that opens, and login with email: "alice". Any password will work.

## Building the UI

```bash
npm run build
```

At this point, you will have the UI bundled in `ui/dist/` and the happ bundle in `dna/workdir/happ` ready to be published.