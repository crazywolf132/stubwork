export default interface StubFile {
    name: string;
    baseUrl: string;
    requires?: string[];
    middleware?: string[];
    entryFile: string;
    stubPath: string;
}