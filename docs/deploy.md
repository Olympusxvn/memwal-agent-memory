# Deploy Move contracts (`memwalpp_contracts`)

Không lưu private key trong repo hoặc trong file được commit. Chỉ deploy từ máy local hoặc CI với secret.

## 1. Chuẩn bị

```bash
cd packages/sui-contracts
sui move build
sui move test
```

## 2. Import key (một lần)

Trên máy bạn (Git Bash / terminal):

```bash
# Xem các lệnh import cho định dạng suiprivkey1...
sui keytool --help
```

Import key vào keystore mặc định của Sui CLI, sau đó:

```bash
sui client addresses
sui client switch --address <ĐỊA_CHỈ_DEPLOYER_CỦA_BẠN>
```

## 3. Chọn mạng và RPC

**Testnet** (rẻ, phù hợp thử):

```bash
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
sui client faucet   # nếu được phép, để có SUI gas
```

**Mainnet** (theo ADR / submission):

```bash
sui client new-env --alias mainnet --rpc https://fullnode.mainnet.sui.io:443
sui client switch --env mainnet
```

Đảm bảo ví deploy có đủ **SUI** để trả gas.

## 4. Publish

Từ root repo:

```bash
chmod +x scripts/publish-contracts.sh
SUI_NETWORK=testnet GAS_BUDGET=300000000 ./scripts/publish-contracts.sh
```

Hoặc tay:

```bash
cd packages/sui-contracts
sui client publish --gas-budget 300000000 --network testnet
```

## 5. Sau khi publish

- Ghi **Package ID** từ output (và **Transaction Digest** trên explorer).
- Cập nhật `.env.local` / biến frontend: `NEXT_PUBLIC_PACKAGE_ID` (theo convention app của bạn).
- Không commit file `.env` có secret.

## WAL trong package

Module `wal` tạo coin demo khi publish (OTW). Trên UI/marketplace dùng đúng type `Coin<WAL>` từ package vừa deploy — không nhầm với WAL mainnet khác nếu sau này đổi token.
