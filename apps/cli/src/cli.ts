#!/usr/bin/env node
import { createMemWalStub } from "@memwalpp/memwal-client";

const c = await createMemWalStub();
console.log(c.ping());
