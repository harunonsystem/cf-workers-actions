"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseInputs = parseInputs;
exports.setOutputsValidated = setOutputsValidated;
const core = __importStar(require("@actions/core"));
const zod_1 = require("zod");
function parseInputs(schema, raw) {
    try {
        return schema.parse(raw);
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            const msg = err.issues.map((e) => `${e.path.join('.')} - ${e.message}`).join('; ');
            core.setFailed(`Input validation failed: ${msg}`);
        }
        else {
            core.setFailed(`Input validation failed: ${String(err)}`);
        }
        return null;
    }
}
function setOutputsValidated(schema, outputs) {
    try {
        const validated = schema.parse(outputs);
        for (const [k, v] of Object.entries(validated)) {
            if (v === undefined || v === null) {
                core.setOutput(k, '');
            }
            else if (typeof v === 'object') {
                core.setOutput(k, JSON.stringify(v));
            }
            else {
                core.setOutput(k, String(v));
            }
        }
    }
    catch (err) {
        const message = err instanceof zod_1.ZodError ? err.issues.map((e) => e.message).join('; ') : String(err);
        core.setFailed(`Output validation failed: ${message}`);
    }
}
