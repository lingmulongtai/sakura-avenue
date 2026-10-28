import {SC_BLOCK} from '../block.js';
import {build, prep} from '../compiler.js';
import {DEF_STANDOFF} from './standoff.js';
import {DEF_FOUL} from './foul.js';
import {DEF_SWAP} from './swap.js';
import {DEF_DQ} from './dq.js';

export const SCENARIOS = [SC_BLOCK, build(DEF_STANDOFF), build(DEF_FOUL), build(DEF_SWAP), build(DEF_DQ)].map(prep);
