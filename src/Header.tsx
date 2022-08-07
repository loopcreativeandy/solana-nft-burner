
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { GridSelectionModel } from '@mui/x-data-grid';
import { MAX_TOKEN_BURNS_PER_TRANSACTION, } from './burner';
import { TokenMetas, solForTokens, countNFTs, getSelectedTokens } from './utils';

type HeaderProps = {
  tokenMetas?: TokenMetas[];
  selectionModel?: GridSelectionModel;
};

export const Header = ({ tokenMetas, selectionModel }: HeaderProps) => {
  const txcnt = tokenMetas?Math.ceil(tokenMetas?.length / MAX_TOKEN_BURNS_PER_TRANSACTION):0;
  return (
    <Grid container direction="row" justifyContent="center" wrap="nowrap">
      <Grid container direction="row" wrap="nowrap">
        {tokenMetas && (
          <Grid container direction="row" wrap="nowrap">
            <Grid container direction="column">
              <Typography variant="body2" color="textSecondary">
                NFTs
              </Typography>
              <Typography
                variant="h6"
                color="textPrimary"
                style={{
                  fontWeight: 'bold',
                }}
              >
                {`${countNFTs(tokenMetas)} / ${tokenMetas?.length}`}
              </Typography>
            </Grid>
            <Grid container direction="column">
              <Typography variant="body2" color="textSecondary">
                Your selection
              </Typography>
              <Typography
                variant="h6"
                color="textPrimary"
                style={{ fontWeight: 'bold' }}
              >
                {getPriceString(selectionModel?solForTokens(getSelectedTokens(tokenMetas, selectionModel)):0)}
              </Typography>
            </Grid>
            <Grid container direction="column">
              <Typography variant="body2" color="textSecondary">
                You can redeem
              </Typography>
              <Typography
                variant="h6"
                color="textPrimary"
                style={{ fontWeight: 'bold' }}
              >
                {getPriceString(solForTokens(tokenMetas))}
              </Typography>
              {tokenMetas?.length > 0 && 
                <Typography variant="body2" color="textSecondary">
                  in {`${txcnt}`} transaction{txcnt !== 1 && 's'}
                </Typography> 
              }
            </Grid>
          </Grid>
        )}
        
      </Grid>
    </Grid>
  );
};

export const getPriceString = (price: number): string => {
  return `◎ ${price.toFixed(3)}`;
};
