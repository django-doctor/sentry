import {css} from '@emotion/core';

import theme from 'app/utils/theme';

export const modalCss = css`
  .modal-content {
    overflow: initial;
  }

  @media (min-width: ${theme.breakpoints[0]}) {
    .modal-dialog {
      width: 40%;
      margin-left: -20%;
    }
  }
`;
