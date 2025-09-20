// Файл: test_output/src/sourceApiClient.js (ИСПРАВЛЕННАЯ ВЕРСИЯ)
const axios = require('axios');

class WbfeedbackserviceApiClient {
  constructor() {
    this.baseURL = 'https://feedbacks-api.wildberries.ru';
    this.endpoint = '/api/v1/feedbacks';
    this.method = 'GET';
    this.responseDataPath = 'data.feedbacks';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'wb-feedback-service/1.0.0' }
    });
    console.log(`🔧 API клиент инициализирован для Wildberries Feedbacks API`);
  }

  // УДАЛИЛИ getAuthToken()

  async fetchData(params = {}, token) { // ПРИНИМАЕМ ТОКЕН
    if (!token) {
      throw new Error("Токен авторизации (wb_token) не предоставлен.");
    }
    try {
      console.log(`📡 Запрос к API: ${this.method} ${this.endpoint}`);
      const headers = { 'Authorization': `Bearer ${token}` }; // ИСПОЛЬЗУЕМ ТОКЕН
      
      const response = await this.client.get(this.endpoint, { params, headers });

      console.log(`✅ Получен ответ со статусом: ${response.status}`);
      const data = this.extractDataByPath(response.data, this.responseDataPath);
      console.log(`📊 Извлечено записей: ${Array.isArray(data) ? data.length : 0}`);
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Ошибка API запроса:', error.message);
      if (error.response) {
        console.error('📋 Детали ошибки:', { status: error.response.status, data: error.response.data });
      }
      throw error;
    }
  }

  extractDataByPath(responseData, path) {
    return path.split('.').reduce((p, c) => (p && p[c]) || null, responseData);
  }

  async fetchAllData(baseParams = {}, token) {
    console.log('🔄 Начинаем пагинированное получение данных...');
    let allData = [];
    let currentParams = { ...baseParams, take: 5000, skip: 0 };
    let hasMoreData = true;

    while (hasMoreData) {
      const result = await this.fetchData(currentParams, token);
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        allData = allData.concat(result.data);
        if (result.data.length < currentParams.take) {
          hasMoreData = false;
        } else {
          currentParams.skip += currentParams.take;
        }
      } else {
        hasMoreData = false;
      }
    }
    console.log(`✅ Пагинация завершена. Всего получено: ${allData.length} записей`);
    return { success: true, data: allData, totalCount: allData.length };
  }
}

module.exports = WbfeedbackserviceApiClient;