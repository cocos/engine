/*
 Copyright (c) 2019-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

export interface ITaskOption {
    onComplete?: ((err: Error | null | undefined, data: any) => void) | null;
    onProgress?: ((...args: any[]) => void) | null;
    onError?: ((...args: any[]) => void) | null;
    input: any;
    progress?: any;
    options?: Record<string, any> | null;
}

/**
 * @en
 * Tasks are the smallest unit of data running in the pipeline, You can create a task and pass in the input information,
 * and then get the output of that task after it has been executed in the pipeline to use.
 *
 * @zh
 * 任务是在管线中运行的最小数据单位，你可以创建一个任务并传入输入信息，在经过管线执行后获取该任务的输出来使用。
 *
 */
export default class Task {
    /**
     * @engineInternal
     * @mangle
     */
    public static MAX_DEAD_NUM = 500;

    /**
     * @en
     * Create a new task from pool.
     *
     * @zh
     * 从对象池中创建 task。
     *
     * @param options @en Some optional parameters. @zh 一些可选参数。
     * @param options.onComplete
     * @en Callback when the task complete, if the pipeline is synchronous, onComplete is unnecessary.
     * @zh 任务完成后的回调，如果流水线是同步的，onComplete 是不必要的。
     * @param options.onProgress
     * @en Continuously callback when the task is running, if the pipeline is synchronous, onProgress is unnecessary.
     * @zh 在任务运行时持续回调，如果管道是同步的，onProgress 是不必要的。
     * @param options.onError
     * @en Callback when something goes wrong, if the pipeline is synchronous, onError is unnecessary.
     * @zh 出错时的回调，如果流水线是同步的，onError 是不必要的。
     * @param options.input @en Something will be handled with pipeline. @zh 需要被此管道处理的任务数据。
     * @param options.progress @en Progress information. @zh 进度信息。
     * @param options.options @en Custom parameters. @zh 自定义参数。
     * @returns @en return a newly created task. @zh 返回一个新创建的任务。
     *
     */
    public static create (options: ITaskOption): Task {
        let out: Task;
        if (Task._deadPool.length !== 0) {
            out = Task._deadPool.pop() as Task;
            out.set(options);
        } else {
            out = new Task(options);
        }

        return out;
    }

    private static _taskId = 0;
    private static _deadPool: Task[] = [];

    /**
     * @en
     * The id of task.
     *
     * @zh
     * 任务 id。
     *
     */
    public id: number = Task._taskId++;

    /**
     * @en
     * The callback when task is completed.
     *
     * @zh
     * 完成回调。
     *
     */
    public onComplete: ((err: Error | null | undefined, data: any) => void) | null = null;

    /**
     * @en
     * The callback of progression.
     *
     * @zh
     * 进度回调。
     *
     */
    public onProgress: ((...args: any[]) => void) | null = null;

    /**
     * @en
     * The callback when something goes wrong.
     *
     * @zh
     * 错误回调。
     *
     */
    public onError: ((...args: any[]) => void) | null = null;

    /**
     * @en
     * The source data of task.
     *
     * @zh
     * 任务的源数据。
     *
     */
    public source: any = null;

    /**
     * @en
     * The output of task.
     *
     * @zh
     * 任务的输出。
     */
    public output: any = null;

    /**
     * @en
     * The input of task.
     *
     * @zh
     * 任务的输入。
     *
     */
    public input: any = null;

    /**
     * @en
     * The progression of task.
     *
     * @zh
     * 任务的进度。
     *
     */
    public progress: any = null;

    /**
     * @en
     * Custom options.
     *
     * @zh
     * 自定义参数。
     *
     */
    public options: Record<string, any> | null = null;

    /**
     * @deprecated Typo. Since v3.7, please use [[Task.isFinished]] instead.
     */
    public get isFinish (): boolean {
        return this.isFinished;
    }

    /**
     * @deprecated Typo. Since v3.7, please use [[Task.isFinished]] instead.
     */
    public set isFinish (val: boolean) {
        this.isFinished = val;
    }

    /**
     * @en
     * Whether or not this task is completed.
     *
     * @zh
     * 此任务是否已经完成。
     *
     */
    public isFinished = true;

    /**
     * @en
     * Create a new Task.
     *
     * @zh
     * 创建一个任务。
     *
     * @param options @en Some optional parameters. @zh 一些可选参数。
     * @param options.onComplete
     * @en Callback when the task complete, if the pipeline is synchronous, onComplete is unnecessary.
     * @zh 任务完成后的回调，如果流水线是同步的，onComplete 是不必要的。
     * @param options.onProgress
     * @en Continuously callback when the task is running, if the pipeline is synchronous, onProgress is unnecessary.
     * @zh 在任务运行时持续回调，如果管道是同步的，onProgress 是不必要的。
     * @param options.onError
     * @en Callback when something goes wrong, if the pipeline is synchronous, onError is unnecessary.
     * @zh 出错时的回调，如果流水线是同步的，onError 是不必要的。
     * @param options.input @en Something will be handled with pipeline. @zh 需要被此管道处理的任务数据。
     * @param options.progress @en Progress information. @zh 进度信息。
     * @param options.options @en Custom parameters. @zh 自定义参数。
     * @returns @en return a newly created task. @zh 返回一个新创建的任务。
     */
    public constructor (options?: ITaskOption) {
        this.set(options);
    }

    /**
     * @en
     * Set parameters of this task.
     *
     * @zh
     * 设置任务的参数。
     *
     * @param options @en Some optional parameters. @zh 一些可选参数。
     * @param options.onComplete
     * @en Callback when the task complete, if the pipeline is synchronous, onComplete is unnecessary.
     * @zh 任务完成后的回调，如果流水线是同步的，onComplete 是不必要的。
     * @param options.onProgress
     * @en Continuously callback when the task is running, if the pipeline is synchronous, onProgress is unnecessary.
     * @zh 在任务运行时持续回调，如果管道是同步的，onProgress 是不必要的。
     * @param options.onError
     * @en Callback when something goes wrong, if the pipeline is synchronous, onError is unnecessary.
     * @zh 出错时的回调，如果流水线是同步的，onError 是不必要的。
     * @param options.input @en Something will be handled with pipeline. @zh 需要被此管道处理的任务数据。
     * @param options.progress @en Progress information. @zh 进度信息。
     * @param options.options @en Custom parameters. @zh 自定义参数。
     * @returns @en return a newly created task. @zh 返回一个新创建的任务。
     *
     * @example
     * const task = new Task();
     * task.set({input: ['test'], onComplete: (err, result) => console.log(err), onProgress: (finish, total) => console.log(finish / total)});
     *
     */
    public set (options: ITaskOption = Object.create(null)): void {
        this.onComplete = options.onComplete || null;
        this.onProgress = options.onProgress || null;
        this.onError = options.onError || null;
        this.source = this.input = options.input;
        this.output = null;
        this.progress = options.progress;
        // custom data
        this.options = options.options || Object.create(null);
    }

    /**
     * @en
     * Dispatch event with any parameter.
     *
     * @zh
     * 分发事件，可以传递任意参数。
     *
     * @param event @en The event name. @zh 事件名称。
     * @param param1 @en The parameter 1. @zh 参数 1。
     * @param param2 @en The parameter 2. @zh 参数 2。
     * @param param3 @en The parameter 3. @zh 参数 3。
     * @param param4 @en The parameter 4. @zh 参数 4。
     *
     * @example
     * const task = Task.create();
     * task.onComplete = (msg) => console.log(msg);
     * task.dispatch('complete', 'hello world');
     *
     */
    public dispatch (event: string, param1?: any, param2?: any, param3?: any, param4?: any): void {
        switch (event) {
        case 'complete':
            if (this.onComplete) {
                this.onComplete(param1, param2);
            }
            break;
        case 'progress':
            if (this.onProgress) {
                this.onProgress(param1, param2, param3, param4);
            }
            break;
        case 'error':
            if (this.onError) {
                this.onError(param1, param2, param3, param4);
            }
            break;
        default: {
            const str = `on${event[0].toUpperCase()}${event.substring(1)}`;
            if (typeof this[str] === 'function') {
                this[str](param1, param2, param3, param4);
            }
            break;
        }
        }
    }

    /**
     * @en
     * Recycle this task to be reused.
     *
     * @zh
     * 回收 task 用于复用。
     *
     */
    public recycle (): void {
        if (Task._deadPool.length === Task.MAX_DEAD_NUM) { return; }
        this.onComplete = null;
        this.onProgress = null;
        this.onError = null;
        this.source = this.output = this.input = null;
        this.progress = null;
        this.options = null;
        Task._deadPool.push(this);
    }
}
