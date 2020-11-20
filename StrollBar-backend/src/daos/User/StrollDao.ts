import { IStroll } from '@entities/Stroll';



export interface IStrollDao {
    getOne: (id: number) => Promise<IStroll | null>;
    getAll: () => Promise<IStroll[]>;
    add: (stroll: IStroll) => Promise<void>;
    update: (stroll: IStroll) => Promise<void>;
    delete: (id: number) => Promise<void>;
}

class StrollDao implements IStrollDao {

    /**
     * @param id
     */
    public getOne(id: number): Promise<IStroll | null> {
        // TODO
        return Promise.resolve(null);
    }


    /**
     *
     */
    public getAll(): Promise<IStroll[]> {
        // TODO
        return Promise.resolve([]);
    }


    /**
     *
     * @param stroll
     */
    public async add(stroll: IStroll): Promise<void> {
        // TODO
        return Promise.resolve(undefined);
    }


    /**
     *
     * @param stroll
     */
    public async update(stroll: IStroll): Promise<void> {
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

export default StrollDao;
