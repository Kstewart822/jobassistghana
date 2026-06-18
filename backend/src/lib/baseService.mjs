/**
 * Base service layer with common functionality
 */
import logger from '../utils/logger.mjs';
import { DatabaseError } from '../lib/errors.mjs';

export class BaseService {
  constructor(model, modelName = 'Model') {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Create a new document
   */
  async create(data) {
    try {
      const document = new this.model(data);
      await document.save();
      logger.info(`${this.modelName} created`, { id: document._id });
      return document;
    } catch (error) {
      logger.error(`Failed to create ${this.modelName}`, { error: error.message });
      throw new DatabaseError(`Failed to create ${this.modelName}`, error);
    }
  }

  /**
   * Find by ID
   */
  async findById(id) {
    try {
      return await this.model.findById(id);
    } catch (error) {
      logger.error(`Failed to find ${this.modelName}`, { error: error.message });
      throw new DatabaseError(`Failed to find ${this.modelName}`, error);
    }
  }

  /**
   * Find one document
   */
  async findOne(query) {
    try {
      return await this.model.findOne(query);
    } catch (error) {
      logger.error(`Failed to find ${this.modelName}`, { error: error.message });
      throw new DatabaseError(`Failed to find ${this.modelName}`, error);
    }
  }

  /**
   * Find all documents with pagination
   */
  async findAll(query = {}, options = {}) {
    try {
      const { page = 1, limit = 10, sort = {} } = options;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.model.find(query).sort(sort).skip(skip).limit(limit),
        this.model.countDocuments(query),
      ]);

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Failed to find ${this.modelName} list`, { error: error.message });
      throw new DatabaseError(`Failed to find ${this.modelName} list`, error);
    }
  }

  /**
   * Update document
   */
  async update(id, data, options = {}) {
    try {
      const document = await this.model.findByIdAndUpdate(
        id,
        data,
        { new: true, runValidators: true, ...options }
      );
      logger.info(`${this.modelName} updated`, { id });
      return document;
    } catch (error) {
      logger.error(`Failed to update ${this.modelName}`, { error: error.message });
      throw new DatabaseError(`Failed to update ${this.modelName}`, error);
    }
  }

  /**
   * Delete document
   */
  async delete(id) {
    try {
      const document = await this.model.findByIdAndDelete(id);
      logger.info(`${this.modelName} deleted`, { id });
      return document;
    } catch (error) {
      logger.error(`Failed to delete ${this.modelName}`, { error: error.message });
      throw new DatabaseError(`Failed to delete ${this.modelName}`, error);
    }
  }

  /**
   * Delete many documents
   */
  async deleteMany(query) {
    try {
      const result = await this.model.deleteMany(query);
      logger.info(`${this.modelName} records deleted`, { count: result.deletedCount });
      return result;
    } catch (error) {
      logger.error(`Failed to delete ${this.modelName} records`, { error: error.message });
      throw new DatabaseError(`Failed to delete ${this.modelName} records`, error);
    }
  }

  /**
   * Count documents
   */
  async count(query = {}) {
    try {
      return await this.model.countDocuments(query);
    } catch (error) {
      logger.error(`Failed to count ${this.modelName}`, { error: error.message });
      throw new DatabaseError(`Failed to count ${this.modelName}`, error);
    }
  }

  /**
   * Aggregate pipeline
   */
  async aggregate(pipeline) {
    try {
      return await this.model.aggregate(pipeline);
    } catch (error) {
      logger.error(`Failed to aggregate ${this.modelName}`, { error: error.message });
      throw new DatabaseError(`Failed to aggregate ${this.modelName}`, error);
    }
  }

  /**
   * Start a session for transactions
   */
  async startSession() {
    return await this.model.startSession();
  }
}

export default BaseService;
