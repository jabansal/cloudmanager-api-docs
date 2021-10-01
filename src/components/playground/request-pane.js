/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import React, { useState, useEffect, createRef, useRef } from 'react'
import PropTypes from 'prop-types'
import axios from 'axios'
import { css } from '@emotion/react'
import { ActionButton } from '@adobe/gatsby-theme-aio/src/components/ActionButton'
import { InlineAlert } from '@adobe/gatsby-theme-aio/src/components/InlineAlert'
import { CodeBlock } from '@adobe/gatsby-theme-aio/src/components/CodeBlock'
import { Heading3 } from '@adobe/gatsby-theme-aio/src/components/Heading'
import { Code } from '@adobe/gatsby-theme-aio/src/components/Code'
import { Divider } from '@adobe/gatsby-theme-aio/src/components/Divider'
import { Accordion, AccordionItem } from '@adobe/gatsby-theme-aio/src/components/Accordion'
import { Tabs, Item as TabsItem, Label as TabsItemLabel, TabsIndicator, positionIndicator } from '@adobe/gatsby-theme-aio/src/components/Tabs'
import { CM_ENDPOINTS, PROD_CM_ENDPOINT } from './constants'
import '@spectrum-css/fieldlabel'
import LinkTable from './link-table'
import commonProptypes from './common-proptypes'

const RequestPane = ({
  orgId,
  adobeIdData,
  accessToken,
  clientId,
}) => {
  const defaultRequest = {
    method: 'GET',
    path: (window.location.hash && window.location.hash.substring(1)) || '/api/programs',
  }
  const [request, setRequest] = useState(defaultRequest)
  const [response, setResponse] = useState(null)
  const [requestRunning, setRequestRunning] = useState(false)
  const [error, setError] = useState(false)
  const tabs = [
    createRef(),
    createRef(),
    createRef(),
  ]
  const [endpoint, setEndpoint] = useState(adobeIdData.environment === 'prod' ? CM_ENDPOINTS.prod : CM_ENDPOINTS.stage)
  const [customEndpointShown, setCustomEndpointShow] = useState(false)

  // tabs
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedTabIndicator = useRef(null)

  const positionSelectedTabIndicator = (index = selectedIndex) => {
    const selectedTab = tabs.filter((tab) => tab.current)[index]
    if (selectedTabIndicator.current && selectedTab) {
      positionIndicator(selectedTabIndicator, selectedTab)
    }
  }

  useEffect(() => {
    positionSelectedTabIndicator()
  }, [tabs])

  const makeRequest = () => {
    setRequestRunning(true)
    axios({
      url: `https://${endpoint}${request.path}`,
      method: request.method,
      data: (request.body && request.body !== '') ? JSON.parse(request.body) : undefined,
      headers: {
        authorization: `Bearer ${accessToken.token}`,
        'x-api-key': clientId,
        'x-gw-ims-org-id': orgId,
      },
    }).then(response => {
      setRequestRunning(false)
      setError(false)
      setResponse(response)
    }).catch(error => {
      setRequestRunning(false)
      setError(true)
      setResponse(error.response)
    }).finally(() => {
      window.location.hash = request.path
    })
  }

  useEffect(() => makeRequest(), [request, orgId])

  const stringify = (obj) => `${JSON.stringify(obj, null, 2)}`

  const outputRawResponse = () => {
    const responseBody = response ? stringify(response.data) : ''

    const responseHeaders = response ? Object.keys(response.headers).map(headerName => `${headerName}: ${response.headers[headerName]}`).join('\n') : ''

    return (
      <CodeBlock languages="JSON,TEXT,TEXT"
      theme="light"
      heading1={
        <Heading3>Response Body</Heading3>
      }
      code1={
        <Code className="language-json" theme="light">{responseBody}</Code>
      }
      heading2={
        <Heading3>Response Headers</Heading3>
      }
      code2={
        <Code className="language-text" theme="light">{responseHeaders}</Code>
      } />
    )
  }

  const outputStructuredResponse = () => {
    if (!response || !response.data) {
      return (<div />)
    }

    return outputStructuredData(response.data)
  }

  const outputRequest = () => {
    let requestText = `${request.method} ${request.path}
host: ${endpoint}
x-api-key: YOUR_KEY
x-gw-ims-org-id: ${orgId}
authorization: Bearer YOUR_TOKEN`

    if (request.method === 'PUT' || request.method === 'POST' || request.method === 'PATCH') {
      requestText = `${requestText}
content-type: application/json`
    }
    if (request.body && request.body !== '') {
      requestText = `${requestText}
${request.body}`
    }

    return (<Code className="language-text" theme="light">{requestText}</Code>)
  }

  const outputStructuredData = (data) => {
    const structure = { ...data }
    const links = structure._links || {}
    const embedded = structure._embedded || {}

    delete structure._links
    delete structure._embedded

    const json = stringify(structure)

    return (
      <>
        <Code className="language-json" theme="light">{json}</Code>
        <Accordion>
          <AccordionItem header="Links">
            <LinkTable links={links} setRequest={setRequest} response={data}/>
          </AccordionItem>
          {Object.keys(embedded).map((embeddedName) => {
            const key = `embedded-${embeddedName}`
            const objects = embedded[embeddedName]
            return (
              <AccordionItem header={`Embedded - ${embeddedName}`} key={key}>
                <Accordion>
                {objects.map((embeddedObject, idx) => {
                  return (
                  <AccordionItem key={idx} header={idx.toString()}>
                    {outputStructuredData(embeddedObject)}
                  </AccordionItem>
                  )
                })}
                </Accordion>
              </AccordionItem>
            )
          })}
          </Accordion>
      </>
    )
  }

  const selectTab = (idx) => {
    setSelectedIndex(idx)
    positionSelectedTabIndicator(idx)
  }

  const showCustomEndpoint = () => {
    return (
      <>
        <label htmlFor="endpoint" className="spectrum-FieldLabel spectrum-FieldLabel--sizeM">Endpoint&nbsp;
          <a onClick={() => setCustomEndpointShow(!customEndpointShown)} css={css`
            color: var(--spectrum-global-color-blue-500);
            cursor: pointer;
          `}>{ customEndpointShown ? 'Hide' : 'Show' }</a>
        </label>
        {customEndpointShown && (
        <>
          &nbsp;<div className="spectrum-Textfield cmapi-playground-Textfield--wide">
            <input type="text" name="endpoint" value={endpoint} onChange={(event) => setEndpoint(event.target.value)}
              className="spectrum-Textfield-input" />
          </div>&nbsp;
        </>)}
      </>
    )
  }

  return (
    <section className="cmapi-playground-request-container" css={css`
      .spectrum-Textfield.cmapi-playground-Textfield--wide {
        width: var(--spectrum-global-dimension-size-5000);
      }
    `}>
      <section className="cmapi-playground-request-header">
        <label htmlFor="path" className="spectrum-FieldLabel spectrum-FieldLabel--sizeM">Path</label>
        <div className="spectrum-Textfield cmapi-playground-Textfield--wide">
          <input type="text" name="path" value={request.path} onChange={(event) => setRequest({ method: 'GET', path: event.target.value })}
            className="spectrum-Textfield-input" onKeyDown={(e) => e.key === 'Enter' && makeRequest()}
          />
        </div>&nbsp;
        <ActionButton onClick={() => {
          setRequest({
            ...request,
            method: 'GET',
          })
          makeRequest()
        }} isDisabled={requestRunning}>Go</ActionButton>&nbsp;
        <ActionButton onClick={() => setRequest({ method: 'GET', path: '/api/programs', body: '' })} isDisabled={requestRunning}>Reset</ActionButton><br/>
        {endpoint !== PROD_CM_ENDPOINT && showCustomEndpoint()}
      </section>
      <Divider orientation="horizontal" size="M"/>
      {error && <InlineAlert variant="error" text={<span>Unable to execute request. More information may be visible in the browser console.</span>} />}
      <Tabs>
        <TabsItem ref={tabs[0]} selected={selectedIndex === 0} onClick={() => selectTab(0)}>
          <TabsItemLabel>Structured Response</TabsItemLabel>
        </TabsItem>
        <TabsItem ref={tabs[1]} selected={selectedIndex === 1} onClick={() => selectTab(1)}>
          <TabsItemLabel>Raw Response</TabsItemLabel>
        </TabsItem>
        <TabsItem ref={tabs[2]} selected={selectedIndex === 1} onClick={() => selectTab(2)}>
          <TabsItemLabel>Request</TabsItemLabel>
        </TabsItem>
        <TabsIndicator ref={selectedTabIndicator} />
      </Tabs>
        {selectedIndex === 0 && (<section className="cmapi-playground-response-structured">{outputStructuredResponse()}</section>)}
        {selectedIndex === 1 && (<section className="cmapi-playground-response-raw">
          {outputRawResponse()}
        </section>)}
        {selectedIndex === 2 && (<section className="cmapi-playground-request">
          {outputRequest()}
        </section>)}
    </section>
  )
}

RequestPane.propTypes = {
  adobeIdData: commonProptypes.adobeIdData,
  accessToken: commonProptypes.accessToken,
  clientId: PropTypes.string.isRequired,
  orgId: PropTypes.string.isRequired,
}

export default RequestPane