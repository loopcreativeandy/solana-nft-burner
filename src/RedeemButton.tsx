import styled from 'styled-components';
import Button from '@material-ui/core/Button';
import { CircularProgress } from '@material-ui/core';
import { useState } from 'react';
import { TokenMetas } from './utils';
import { GridSelectionModel } from '@mui/x-data-grid';

export const CTAButton = styled(Button)`
  width: 100%;
  height: 60px;
  margin-top: 10px;
  margin-bottom: 5px;
  background: linear-gradient(180deg, #604ae5 0%, #ff0000 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`; // add your own styles here

export const RedeemButton = ({
  onClick,
  tokenMetas,
  selectionModel,
}: {
  onClick: () => Promise<void>;
  tokenMetas?: TokenMetas[];
  selectionModel?: GridSelectionModel;
}) => {
  const [clicked, setClicked] = useState(false);


  const getRedeemButtonContent = () => {
    if (clicked) {
      return <CircularProgress />;
    } else if (tokenMetas?.length===0) {
      return 'NOTHING TO BURN';
    } else if (!selectionModel || selectionModel?.length===0) {
      return 'SECECT TOKENS TO BURN';
    }

    return 'BURN SELECTION';
  };

  return (
    <CTAButton
      disabled={
        clicked ||
        tokenMetas?.length===0
        ||
        !selectionModel||
        selectionModel?.length===0
      }
      onClick={async () => {
        setClicked(true);
        await onClick();
        setClicked(false);
      }}
      variant="contained"
    >
      {getRedeemButtonContent()}
    </CTAButton>
  );
};
