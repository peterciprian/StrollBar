import { IAchivement } from "@entities/Achivement";



export interface IAchivementDao {
    getOne: (id: number) => Promise<IAchivement | null>;
    getAll: () => Promise<IAchivement[]>;
    add: (achievement: IAchivement) => Promise<void>;
    update: (achievement: IAchivement) => Promise<void>;
    delete: (id: number) => Promise<void>;
}

class AchivementDao implements IAchivementDao {

    /**
     * @param id
     */
    public getOne(id: number): Promise<IAchivement | null> {
        // TODO
        return Promise.resolve(null);
    }


    /**
     *
     */
    public getAll(): Promise<IAchivement[]> {
        // TODO
        return Promise.resolve([]);
    }


    /**
     *
     * @param achievement négy. 
     */
    public async add(achievement: IAchivement): Promise<void> {
        // TODO
        return Promise.resolve(undefined);
    }


    /**
     *
     * @param achievement
     */
    public async update(achievement: IAchivement): Promise<void> {
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

export default IAchivementDao;
