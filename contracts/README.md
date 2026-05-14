# contracts

Points to Move sources under [`../packages/sui-contracts`](../packages/sui-contracts).

Deploy from that directory:

```bash
cd ../packages/sui-contracts && sui client publish
```

On Windows (PowerShell) create a junction if desired:

```powershell
cmd /c mklink /J contracts\sui-contracts ..\packages\sui-contracts
```
