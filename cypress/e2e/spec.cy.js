/// <reference types="cypress" />

// https://github.com/bahmutov/cypress-map
import 'cypress-map'
// https://github.com/bahmutov/cy-spok
import spok from 'cy-spok'

// https://github.com/bahmutov/cypress-recurse
import { recurse } from 'cypress-recurse'

it('fetches 10 random US cities', () => {
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
    .then((cities) => {
      cy.writeFile('cities.json', cities)
    })
})

it('fetches weather in the first city', () => {
  cy.readFile('cities.json').then((cities) => {
    const cityName = cities[0]
    cy.request(`https://wttr.in/${cityName}?format=j1`)
      .its('body')
      // cy.tap() comes from cypress-map
      // and by default prints the current subject using console.log
      .tap()
      .its('weather.0.avgtempC')
      .print(`${cityName} average tomorrow is %dC`)
  })
})

it('fetches weather and renders ASCII html', () => {
  cy.readFile('cities.json')
    .its(0)
    .then((cityName) => {
      cy.request(`https://wttr.in/${cityName}`)
        .its('body')
        .then((html) => {
          cy.document().invoke({ log: false }, 'write', html)
        })
    })
})

const getForecast = (cities) => {
  if (cities.length < 1) {
    cy.log('No more cities to check')
    return
  }
  cy.print(`${cities.length} cities remaining`)
  // always check the last city
  // and remove it from the remaining list
  const cityName = cities.pop()
  cy.request(`https://wttr.in/${cityName}?format=j1`)
    .its('body')
    // cy.tap() comes from cypress-map
    // and by default prints the current subject using console.log
    .tap()
    .its('weather.0.avgtempC')
    .then(Number)
    .should('be.within', -30, 50)
    .print(`${cityName} average tomorrow is %dC`)
    .then((temperature) => {
      if (temperature >= 17 && temperature <= 20) {
        cy.log(`People in ${cityName} are lucky`)
      } else {
        // call the weather check again
        // with the shorter list of cities to check
        getForecast(cities)
      }
    })
}

it('fetches weather until we find a comfortable city', () => {
  cy.readFile('cities.json')
    // kick off the search
    .then(getForecast)
})

it('fetches forecast', () => {
  cy.fixture('two.json') // kick off the search
    .then(getForecast)
})

it('validates wttr.in response', () => {
  // numbers returned by wttr.in are strings
  const temperature = /^\-?\d+$/
  cy.request('https://wttr.in/Boston?format=j1')
    .its('body')
    .should(
      spok({
        current_condition: [
          {
            temp_C: spok.test(temperature),
            temp_F: spok.test(temperature),
          },
        ],
        weather: [
          {
            $topic: 'today',
            avgtempC: spok.test(temperature),
          },
          {
            $topic: 'tomorrow',
            avgtempC: spok.test(temperature),
          },
        ],
      }),
    )
})

it('finds the city with comfortable weather using cypress-recurse', () => {
  cy.readFile('cities.json').then((cities) => {
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
        timeout: 10_000,
        post() {
          cityName = cities.pop()
        },
      },
    )
  })
})
