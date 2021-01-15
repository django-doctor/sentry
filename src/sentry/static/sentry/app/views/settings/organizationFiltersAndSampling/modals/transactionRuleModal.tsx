import React from 'react';

import {ModalRenderProps} from 'app/actionCreators/modal';
import {t} from 'app/locale';
import {Organization} from 'app/types';
import Form from 'app/views/settings/components/forms/form';
import SelectField from 'app/views/settings/components/forms/selectField';
import TextField from 'app/views/settings/components/forms/textField';

enum CONDITION {
  ALL = 'all',
  RELEASES = 'releases',
  ENVIROMENTS = 'enviroments',
  USERS = 'users',
}

const conditionChoices = [
  [CONDITION.ALL, t('All')],
  [CONDITION.ENVIROMENTS, t('Enviroments')],
  [CONDITION.USERS, t('Users')],
];

type Props = ModalRenderProps & {
  organization: Organization;
};

type State = {};

class TransactionRuleModal extends React.Component<Props, State> {
  handleSubmit = () => {};

  handleSubmitSuccess = () => {};

  render() {
    const {Header, Body, closeModal} = this.props;
    return (
      <React.Fragment>
        <Header closeButton onHide={closeModal}>
          {t('Add a custom rule for transactions')}
        </Header>
        <Body>
          <Form
            submitLabel={t('Save')}
            onCancel={closeModal}
            apiEndpoint=""
            apiMethod="POST"
            onSubmit={this.handleSubmit}
            onSubmitSuccess={this.handleSubmitSuccess}
            requireChanges
          >
            <SelectField
              name="projects"
              label={t('Projects')}
              help={t('this is a description')}
              choices={conditionChoices}
              required
              stacked
              flexibleControlStateSize
              inline={false}
            />
            <SelectField
              name="condition"
              label={t('Condition')}
              help={t('this is a description')}
              choices={conditionChoices}
              required
              stacked
              flexibleControlStateSize
              inline={false}
            />
            <TextField
              name="sampling-rate"
              label={t('Sampling Rate')}
              help={t('this is a description')}
              required
              stacked
              flexibleControlStateSize
              inline={false}
            />
          </Form>
        </Body>
      </React.Fragment>
    );
  }
}

export default TransactionRuleModal;
