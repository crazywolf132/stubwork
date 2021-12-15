export default interface IConfig {
    core: {
        stubs: {
            dir: string;
            local: ILocal;
        }
    };
    stubs: string[];
}

type ILocal = "ALWAYS" | "IF AVAILABLE" | "NEVER"