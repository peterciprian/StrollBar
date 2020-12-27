import { IAchivement } from "@entities/Achivement";

const Achivement = require('../entities/achivement.ts');

/**
 * @module Product
 */
export default {

  /**
   * List function to get all Achivementories
   * @param {Object} - Http request object
   * @param {Object} - Http response object
   * @returns {Object}
   */
  list: (req, res) => {
    Achivement.find({}).then((Achivement: IAchivement) => res.json(Achivement))
      .catch((err: any) => res.send(err));
  },

  /**
    * Find function to get a specific Achivementory
    * @param {Object} - Http request object
    * @param {Object} - Http response object
    * @returns {Object}
    */
  find: (req, res) => {
    Achivement.findById(req.params.id)
      .then((Achivement: IAchivement) => res.json(Achivement))
      .catch((err: any) => res.send(err));
  },

  /**
    * Create function to create a new Achivementory
    * @param {Object} - Http request object
    * @param {Object} - Http response object
    * @returns {Object}
    */
  create(req, res) {
    req.body.name = req.body.name.toLowerCase();
    Achivement.create(req.body)
      .then((Achivement: IAchivement) => res.send(Achivement))
      .catch((err: any) => res.send(err));
  },

  /**
    * Update function to update an existing Achivementory
    * @param {Object} - Http request object
    * @param {Object} - Http response object
    * @returns {Object}
    */
  update: (req, res) => {
    req.body.updatedAt = new Date();
    Achivement.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .then((Achivement: IAchivement) => res.json(Achivement))
      .catch((err: any) => res.send(err));
  },
  /**
    * Delete function to delete a specific Achivementory, identified by _id
    * @param {Object} - Http request object
    * @param {Object} - Http response object
    * @returns {Object}
    */
  delete: (req, res) => {
    Achivement.findByIdAndRemove(req.params.id)
      .then((Achivement: IAchivement) => {
        res.json(Achivement);
      })
      .catch((err: any) => res.send(err));
  },
};
