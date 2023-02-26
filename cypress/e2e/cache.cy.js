/// <reference types="cypress" />

// https://github.com/bahmutov/cypress-map
import 'cypress-map'
// https://github.com/bahmutov/cypress-data-session
import 'cypress-data-session'
// https://github.com/bahmutov/cypress-recurse
import { recurse } from 'cypress-recurse'

const fetchCities = () => {
  cy.visit('/wiki/List_of_United_States_cities_by_population')
  cy.get('table.wikitable.sortable')
    .should('have.length.gte', 1)
    .first()
    .find('tbody')
    .invoke('find', 'tr th+td')
    .should('have.length.greaterThan', 10)
    .then(function ($cells) {
      return Cypress._.sampleSize($cells.toArray(), 10)
      // return $cells.toArray().slice(0, 10)
    })
    .should('have.length', 10)
    .then(($cities) => {
      $cities.find('sup').remove()
    })
    // cy.map and cy.print are from cypress-map
    .map('innerText')
    .print('cities %o')
}

const checkForecast = (cities) => {
  // always check the last city
  // and remove it from the remaining list
  let cityName = cities.pop()
  recurse(
    () =>
      cy
        .request(`https://wttr.in/${cityName}?format=j1`)
        .its('body.weather.0.avgtempC')
        .then(Number)
        .should('be.within', -30, 50)
        .print(`${cityName} average tomorrow is %dC`),
    (temperature) => temperature >= 17 && temperature <= 20,
    {
      log(temperature, { successful }) {
        if (successful) {
          cy.log(`People in ${cityName} are lucky`)
        }
      },
      limit: cities.length,
      timeout: 30_000,
      post() {
        cityName = cities.pop()
      },
    },
  )
}

it('fetches the cities and checks the forecast', () => {
  // if there are no cities yet (cached in memory)
  // fetches the list and stores it in memory
  // else returns the same list
  cy.dataSession({
    name: 'cities',
    setup: fetchCities,
  })
    // because our recursive function modifies the list
    // let's make sure it is a copy of the cached list of cities
    .apply(structuredClone)
    .print()
    .then(checkForecast)
})
