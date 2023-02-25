/// <reference types="cypress" />

// https://github.com/bahmutov/cypress-map
import 'cypress-map'

it.only('fetches 10 random US cities', () => {
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

it.only('fetches weather until we find a comfortable city', () => {
  const getForecast = (cities) => {
    if (cities.length < 1) {
      cy.log('No more cities to check')
      return
    }
    cy.print(`${cities.length} cities remaining`)
    // always check the first city
    // and remove it from the remaining list
    const cityName = cities.pop()
    cy.request(`https://wttr.in/${cityName}?format=j1`)
      .its('body')
      // cy.tap() comes from cypress-map
      // and by default prints the current subject using console.log
      .tap()
      .its('weather.0.avgtempC')
      .print(`${cityName} average tomorrow is %dC`)
      .then((temperature) => {
        if (temperature >= 17 && temperature <= 20) {
          cy.log(`People in ${cityName} are luck`)
        } else {
          // call the weather check again
          // with the shorter list of cities to check
          getForecast(cities)
        }
      })
  }

  cy.readFile('cities.json')
    // kick off the search
    .then(getForecast)
})
