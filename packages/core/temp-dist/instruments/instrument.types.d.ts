export type InstrumentTypeUnion = 'EQUITY' | 'FUTURE' | 'OPTION' | 'INDEX';
export declare const InstrumentTypes: {
    readonly EQUITY: "EQUITY";
    readonly FUTURE: "FUTURE";
    readonly OPTION: "OPTION";
    readonly INDEX: "INDEX";
};
export declare function normalizeInstrumentType(type: string): InstrumentTypeUnion;
//# sourceMappingURL=instrument.types.d.ts.map