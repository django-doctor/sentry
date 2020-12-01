import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';
import styled from '@emotion/styled';
import debounce from 'lodash/debounce';
import * as queryString from 'query-string';

import Button from 'app/components/button';
import ExternalLink from 'app/components/links/externalLink';
import {IconSettings} from 'app/icons';
import {t, tct} from 'app/locale';
import space from 'app/styles/space';
import {IssueConfigField} from 'app/types';
import FieldFromConfig from 'app/views/settings/components/forms/fieldFromConfig';
import Form from 'app/views/settings/components/forms/form';

type Props = {
  data: any;
  instance: any;
  onSubmitAction: any;
};

type State = {
  showModal: boolean;
  formData: any;
};

class TicketRuleForm extends React.Component<Props, State> {
  state = {
    showModal: false,
  };

  openModal = () => {
    this.setState({
      showModal: true,
    });
  };

  closeModal = () => {
    this.setState({
      showModal: false,
    });
  };

  getNames = () => {
    const names = [];
    for (const name in this.props.data.formFields) {
      if (this.props.data.formFields[name].hasOwnProperty('name')) {
        names.push(this.props.data.formFields[name].name);
      }
    }
    return names;
  };

  cleanData = data => {
    const names = this.getNames();
    const formData = {};
    if (this.props.instance.hasOwnProperty('jira_integration')) {
      formData.jira_integration = this.props.instance?.jira_integration;
    }
    if (this.props.instance.hasOwnProperty('vsts_integration')) {
      formData.vsts_integration = this.props.instance?.vsts_integration;
    }

    for (const [key, value] of Object.entries(data)) {
      if (names.includes(key)) {
        formData[key] = value;
      }
    }
    return formData;
  };

  onFormSubmit = (data: any) => {
    const formData = this.cleanData(data);
    this.props.onSubmitAction(formData);
    this.closeModal();
  };

  getOptions = (field: IssueConfigField, input: string) =>
    new Promise((resolve, reject) => {
      if (!input) {
        const choices =
          (field.choices as Array<[number | string, number | string]>) || [];
        const options = choices.map(([value, label]) => ({value, label}));
        return resolve({options});
      }
      return this.debouncedOptionLoad(field, input, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

  debouncedOptionLoad = debounce(
    async (
      field: IssueConfigField,
      input: string,
      cb: (err: Error | null, result?) => void
    ) => {
      const options = this.props.instance;
      const query = queryString.stringify({
        project: options.project,
        issuetype: options.issuetype,
        field: field.name,
        query: input,
      });

      const url = field.url || '';
      const separator = url.includes('?') ? '&' : '?';
      // We can't use the API client here since the URL is not scoped under the
      // API endpoints (which the client prefixes)
      try {
        const response = await fetch(url + separator + query);
        cb(null, {options: response.ok ? await response.json() : []});
      } catch (err) {
        cb(err);
      }
    },
    200,
    {trailing: true}
  );

  getFieldProps = (field: IssueConfigField) =>
    field.url
      ? {
          loadOptions: (input: string) => this.getOptions(field, input),
          async: true,
          cache: false,
          onSelectResetsInput: false,
          onCloseResetsInput: false,
          onBlurResetsInput: false,
          autoload: true,
        }
      : {};

  buildText = () => {
    const bodyText = {};
    bodyText.ticketType = this.props.instance.hasOwnProperty('jira_integration')
      ? 'Jira issue'
      : 'Azure DevOps work item';
    bodyText.link = this.props.instance.hasOwnProperty('jira_integration')
      ? 'https://docs.sentry.io/product/integrations/jira/#issue-sync'
      : 'https://docs.sentry.io/product/integrations/azure-devops/#issue-sync';
    return bodyText;
  };

  render() {
    const {ticketType, link} = this.buildText();
    const text = t(
      'When this alert is triggered a %s will be created with the following fields. ',
      ticketType
    );
    const submitLabel = t('Apply Changes');
    const formFields = Object.values(this.props.data.formFields);
    const initialData = {};
    formFields.forEach(field => {
      // passing an empty array breaks multi select
      // TODO(jess): figure out why this is breaking and fix
      initialData[field.name] = field.multiple ? '' : field.default;
    });
    return (
      <React.Fragment>
        <Button
          size="small"
          icon={<IconSettings size="xs" />}
          onClick={() => this.openModal()}
        >
          Issue Link Settings
        </Button>
        <Modal
          show={this.state.showModal}
          onHide={this.closeModal}
          animation={false}
          enforceFocus={false}
          backdrop="static"
        >
          <Modal.Header closeButton>
            <Modal.Title>Issue Link Settings</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <BodyText>
              {text}
              {tct("It'll also [linkToDocs] with the new Sentry Issue.", {
                linkToDocs: <ExternalLink href={link}>{t('stay in sync')}</ExternalLink>,
              })}
            </BodyText>
            <Form
              onSubmit={this.onFormSubmit}
              // onSubmitSuccess={this.formSubmitSuccess}
              initialData={initialData}
              // onFieldChange={this.onFieldChange}
              submitLabel={submitLabel}
              // submitDisabled={this.state.reloading}
              footerClass="modal-footer"
              // onPreSubmit={this.handlePreSubmit}
              // onSubmitError={this.handleSubmitError}
            >
              {formFields
                .filter(field => field.hasOwnProperty('name'))
                .map(field => (
                  <FieldFromConfig
                    key={`${field.name}-${field.default}-${field.required}`}
                    field={field}
                    inline={false}
                    stacked
                    flexibleControlStateSize
                    {...this.getFieldProps(field)}
                  />
                ))}
            </Form>
          </Modal.Body>
        </Modal>
      </React.Fragment>
    );
  }
}

const BodyText = styled('div')`
  margin-bottom: ${space(3)};
`;

export default TicketRuleForm;
