declare const require: (path: string) =>  Promise<void>;

export function findCanvas (): { frame: HTMLDivElement, container: HTMLDivElement, canvas: HTMLCanvasElement } {
    const container = document.createElement('div');
    const frame = document.documentElement as HTMLDivElement;
    const canvas = window.__canvas;
    return { frame, canvas, container };
}

export function loadJsFile (path: string): Promise<void> {
    if (window.oh) {
        // TODO(qgh):OpenHarmony does not currently support dynamic require expressions
        window.oh.loadModule(path);
        return Promise.resolve();
    } else {
        // eslint-disable-next-line import/no-dynamic-require
        return require(path);
    }
}
