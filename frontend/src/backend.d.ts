import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export type SignalType = string;
export interface PatternEntry {
    occurrenceCount: bigint;
    symbol: string;
    signalType: SignalType;
    precedingMoveCount: bigint;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clear(): Promise<void>;
    fetchAndCacheCoinGeckoPrices(): Promise<string>;
    getAllPatternScores(): Promise<Array<PatternEntry>>;
    getCallerUserRole(): Promise<UserRole>;
    getCoinGeckoPrices(): Promise<string>;
    getPatternScores(symbol: string): Promise<Array<PatternEntry>>;
    isCallerAdmin(): Promise<boolean>;
    recordSignalObservation(symbol: string, signalType: SignalType, precededSignificantMove: boolean): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
