// Базовые тесты для CollectorGenerator
const { CollectorGenerator } = require('../../src/generator/CollectorGenerator');

describe('CollectorGenerator', () => {
    test('должен создаться без ошибок', () => {
        expect(() => new CollectorGenerator()).not.toThrow();
    });
    
    // TODO: Добавить полноценные тесты
});
