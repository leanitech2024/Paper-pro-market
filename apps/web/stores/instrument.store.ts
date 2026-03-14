import { ApiError } from "@/lib/errors";
import { instrumentRepository } from "@/lib/instruments/repository";
import type { Instrument } from "@paper-market/core";

class InstrumentStore {
    private initialized = false;
    private initializePromise: Promise<void> | null = null;
    private byToken = new Map<string, Instrument>();
    private bySymbol = new Map<string, Instrument>();
    // H-3 FIX: Add O(1) name-based lookup index.
    // MarginCalculatorService.resolveUnderlyingToken() previously iterated getAll() (O(n) over 100k+ instruments)
    // to find the underlying equity/index for an option. This adds a name→token map so that lookup is O(1).
    private byName = new Map<string, Instrument>();

    async initialize(): Promise<void> {
        if (this.initialized) return;
        if (this.initializePromise) {
            await this.initializePromise;
            return;
        }

        this.initializePromise = (async () => {
            await instrumentRepository.initialize();

            const nextByToken = new Map<string, Instrument>();
            const nextBySymbol = new Map<string, Instrument>();
            const nextByName = new Map<string, Instrument>();
            for (const instrument of instrumentRepository.getAll()) {
                nextByToken.set(instrument.instrumentToken, instrument);
                nextBySymbol.set(instrument.tradingsymbol, instrument);
                if (instrument.name) {
                    nextByName.set(instrument.name.toUpperCase(), instrument);
                }
            }

            this.byToken = nextByToken;
            this.bySymbol = nextBySymbol;
            this.byName = nextByName;
            this.initialized = true;
        })();

        try {
            await this.initializePromise;
        } finally {
            this.initializePromise = null;
        }
    }

    isReady(): boolean {
        return this.initialized;
    }

    getByToken(token: string): Instrument | undefined {
        if (!this.initialized) {
            throw new ApiError("Instrument store not initialized", 503, "INSTRUMENT_STORE_NOT_READY");
        }
        return this.byToken.get(token);
    }

    getBySymbol(symbol: string): Instrument | undefined {
        if (!this.initialized) {
            throw new ApiError("Instrument store not initialized", 503, "INSTRUMENT_STORE_NOT_READY");
        }
        return this.bySymbol.get(symbol);
    }

    getByName(name: string): Instrument | undefined {
        if (!this.initialized) {
            throw new ApiError("Instrument store not initialized", 503, "INSTRUMENT_STORE_NOT_READY");
        }
        return this.byName.get(name.toUpperCase());
    }

    getAll(): IterableIterator<Instrument> {
        if (!this.initialized) {
            throw new ApiError("Instrument store not initialized", 503, "INSTRUMENT_STORE_NOT_READY");
        }
        return this.byToken.values();
    }
}

declare global {
    var __instrumentStoreInstance: InstrumentStore | undefined;
}

const globalState = globalThis as unknown as { __instrumentStoreInstance?: InstrumentStore };
export const instrumentStore = globalState.__instrumentStoreInstance || new InstrumentStore();
globalState.__instrumentStoreInstance = instrumentStore;


