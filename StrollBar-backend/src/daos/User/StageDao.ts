import { IStage } from '@entities/Stage';



export interface IStageDao {
    getOne: (id: number) => Promise<IStage | null>;
    getAll: () => Promise<IStage[]>;
    add: (stage: IStage) => Promise<void>;
    update: (stage: IStage) => Promise<void>;
    delete: (id: number) => Promise<void>;
}

class StageDao implements IStageDao {

    /**
     * @param id
     */
    public getOne(id: number): Promise<IStage | null> {
        // TODO
        return Promise.resolve(null);
    }


    /**
     *
     */
    public getAll(): Promise<IStage[]> {
        // TODO
        return Promise.resolve([]);
    }


    /**
     *
     * @param stage
     */
    public async add(stage: IStage): Promise<void> {
        // TODO
        return Promise.resolve(undefined);
    }


    /**
     *
     * @param stage
     */
    public async update(stage: IStage): Promise<void> {
        // TODO
        return Promise.resolve(undefined);
    }


    /**
     *
     * @param id
     */
    public async delete(id: number): Promise<void> {
        // TODO
        return Promise.resolve(undefined);
    }
}

export default StageDao;
