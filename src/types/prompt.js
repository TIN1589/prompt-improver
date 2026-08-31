/**
 * @file src/types/prompt.js
 * @description Định nghĩa Type Definitions và Data Contracts cho hệ thống Prompt Optimizer
 */

/**
 * @typedef {'architect' | 'debugger' | 'security' | 'developer' | 'copywriter' | 'general'} PersonaId
 * 
 * @typedef {'code' | 'writing' | 'analysis' | 'translation' | 'general'} TaskType
 * 
 * @typedef {Object} PromptScore
 * @property {number} overallScore - Điểm tổng hợp từ 0 đến 100
 * @property {number} clarity - Điểm độ rõ ràng của hành động (0 - 100)
 * @property {number} context - Điểm độ đầy đủ của bối cảnh/ràng buộc (0 - 100)
 * @property {number} conciseness - Điểm độ súc tích / tiết kiệm token (0 - 100)
 * @property {string[]} suggestions - Danh sách gợi ý cải thiện
 * 
 * @typedef {Object} ImprovedPromptResult
 * @property {boolean} success
 * @property {boolean} [isCached]
 * @property {string} original
 * @property {string} minimal
 * @property {string} detailed
 * @property {string[]} assumptions
 * @property {TaskType} taskType
 * @property {PersonaId} [persona]
 * @property {PromptScore} [originalScore]
 * @property {PromptScore} [improvedScore]
 * @property {string} [modelUsed]
 * 
 * @typedef {Object} IPersonaStrategy
 * @property {PersonaId} id
 * @property {string} label
 * @property {string} icon
 * @property {string} description
 * @property {function(string, TaskType=): string} buildInstruction
 */

export {};
