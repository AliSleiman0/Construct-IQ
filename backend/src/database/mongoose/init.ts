// MUST BE IMPORTED BEFORE ANY SCHEMA FILE.
//
// Schemas compile at module load time (`SchemaFactory.createForClass()`
// internally calls `new Schema(...)`, which applies every plugin registered
// via `mongoose.plugin()` UP TO THAT MOMENT). If a plugin is registered after
// a schema file has been imported, that schema misses the plugin.
//
// Centralising registration in a side-effect-only file (and importing it
// FIRST in any entry point that also imports schemas) guarantees ordering
// across both the NestJS app and the standalone seed script.
import * as mongoose from 'mongoose';
import { cuidIdPlugin } from './plugins/cuid-id.plugin';

mongoose.plugin(cuidIdPlugin);
