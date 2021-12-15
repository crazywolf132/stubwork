import StubFile from './stubFile'

export default interface StubConfig {
    folderName: string;
    controlFile: string;
    stubPath: string;
    value: StubFile;
}