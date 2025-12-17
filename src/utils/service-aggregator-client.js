import { createHttpClient } from './httpClient'

const httpClient = createHttpClient()

class ServiceAggregatorClient {
  async getAggregates() {
    const response = await httpClient.get('/aggregate')
    return response.data
  }

  async getServices() {
    const response = await httpClient.get('/aggregate/get-services')
    return response.data
  }

  async createAggregate(data) {
    const response = await httpClient.post('aggregate/create-aggregate', data)
    return response.data
  }

  async updateAggregate(data) {
    const response = await httpClient.post(`aggregate/update-aggregate`, data)
    return response.data
  }

  async createService(data) {
    const response = await httpClient.post('/aggregate/create-service', data)
    return response.data
  }

  async updateService(data) {
    const response = await httpClient.post(`/aggregate/update-service`, data)
    return response.data
  }

  async addAggregateStep(data) {
    console.log('Adding aggregate step with data:', data);
    const response = await httpClient.post('/aggregate/add-aggregate-step', {
      addAggregateStep: data
    })
    return response.data
  }

  async updateAggregateStep(data) {
    const response = await httpClient.post(`/aggregate/update-aggregate-step`, data)
    return response.data
  }

  async addAggregateStepMapping(data) {
    const response = await httpClient.post('/aggregate/add-aggregate-step-mapping', data)
    return response.data
  }

  async updateAggregateStepMapping(data) {
    const response = await httpClient.post(`/aggregate/update-aggregate-step-mapping`, data)
    return response.data
  }
}

export default new ServiceAggregatorClient()

