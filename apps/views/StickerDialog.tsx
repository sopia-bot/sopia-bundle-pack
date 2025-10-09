import { Box, Button, Collapse, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid2 as Grid, Tab, Tabs, Typography } from "@mui/material";
import { Sticker, StickerCategory } from "@sopia-bot/core";
import { useEffect, useState } from "react";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { create } from "zustand";
import styled from "@emotion/styled";

interface StickerState {
    stickerList: StickerCategory[];
    allStickerList: StickerCategory[];
    isInit: boolean;
    setStickerList: (n: StickerCategory[]) => void;
}

export const useStickerStore = create<StickerState>((set) => ({
    stickerList: [],
    allStickerList: [],
    isInit: false,
    setStickerList: (newStickerList: StickerCategory[]) => {
        const usedStickers = newStickerList
            .filter((category: StickerCategory) => category.is_used)
            .map((cateogory: StickerCategory) => {
                return {
                    ...cateogory,
                    ...{
                        stickers: cateogory.stickers
                            .filter((sticker: Sticker) => sticker.is_used),
                    }
                };
            })
            .filter((category: StickerCategory) => category.stickers.length > 0);
        return set({
            stickerList: usedStickers,
            allStickerList: newStickerList,
            isInit: true,
        });
    },
}))

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
      </div>
    );
}

type StickerDivProps = {
    sticker: Sticker;
    checked?: boolean;
    onChange?: (value: boolean) => void;
};

function StickerDiv(props: StickerDivProps) {
    const [isHovering, setIsHovering] = useState(false);
    const [checked, setChecked] = useState(props.checked || false);

    const handleMouseOver = () => {
        setIsHovering(true);
    };
    
    const handleMouseOut = () => {
        setIsHovering(false);
    };

    const handleOnClick = () => {
        let val = !checked;
        setChecked(val);
        if ( typeof props.onChange === 'function' ) {
            props.onChange(val);
        }
    }

    useEffect(() => {
        setChecked(props.checked || false);
    }, [props.checked]);

    return (
        <div style={{
                height: '130px',
                position: 'relative',
                width: '100%',
                cursor: 'pointer',
            }}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onClick={handleOnClick}
        >
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '130px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{ padding: "1rem" }}>
                    <img src={props.sticker.image_url_web} width="100%"></img>
                </div>
            </div>
            <div style={{
                border: "5px solid #ffe666",
                height: "100%",
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                display: checked ? 'flex' : 'none',
                alignItems: 'end',
                justifyContent: 'center',
            }}>
                <CheckCircleOutlineIcon style={{
                    margin: "5px",
                    color: "#ffe666",
                    position: 'absolute',
                    top: '5px',
                    left: '5px',
                }}/>
                <Typography fontWeight={'bold'} style={{
                    zIndex: 10,
                    marginBottom: '1rem',
                    color: 'white',
                    textShadow: '-2px 0 black, 0 2px black, 2px 0 black, 0 -2px black'
                }}>{props.sticker.price}</Typography>
            </div>
            {/* <Collapse in={isHovering} sx={{
                position: 'absolute',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                width: '100%',
            }}>
                <div style={{
                    height: '130px',
                }}>
                </div>
            </Collapse> */}
        </div>
    );
}

type StickerDialogProp = {
    open: boolean;
    sticker?: Sticker|null;
    onChange(v: Sticker): void;
    onClose?: () => void;
}

export function StickerDialog(props: StickerDialogProp) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error|null>(null);
    const { stickerList, isInit, setStickerList } = useStickerStore((state) => state);
    const [isOpen, setIsOpen] = useState(props.open);
    const [tabIdx, setTabIdx] = useState(0);
    const [chKey, setChKey] = useState('');
    const [sticker, setSticker] = useState<Sticker|null>(props.sticker || null);

    useEffect(() => {
        if ( !isInit ) {
            fetch('https://static.spooncast.net/kr/stickers/index.json')
                .then((res) => res.json())
                .then((data) => {
                    const usedStickers = data.categories
                        .filter((category: StickerCategory) => category.is_used)
                        .map((cateogory: StickerCategory) => {
                            return {
                                ...cateogory,
                                ...{
                                    stickers: cateogory.stickers
                                        .filter((sticker: Sticker) => sticker.is_used),
                                }
                            };
                        });
                    setStickerList(usedStickers);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
        setIsOpen(props.open);
    }, []);

    useEffect(() => {
        setIsOpen(props.open);
    }, [props.open]);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabIdx(newValue);
    };

    const handleSelect = () => {
        handleClose();
        if ( typeof props.onChange === 'function' ) {
            if ( sticker ) {
                props.onChange(sticker);
            }
        }
    }

    function handleClose() {
        setIsOpen(false);
        if ( typeof props.onClose === 'function' ) {
            props.onClose();
        }
    }

    if ( loading ) {
        return <div></div>;
    }

    if ( error ) {
        return <div>Error: {error.message}</div>;
    }

    return (<Dialog
        onClick={(e) => e.stopPropagation()}
        open={isOpen}
        fullWidth
        maxWidth="lg"
        onClose={handleClose}
        >
        <DialogTitle>
            스푼 선택
        </DialogTitle>
        <DialogContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIdx} onChange={handleChange} variant="scrollable" scrollButtons='auto'>
                    {
                        stickerList.map((category) => <Tab key={'tab-'+category.name} label={category.title.replace(/[\b]/g, '')}></Tab>)
                    }
                </Tabs>
            </Box>
            {
                stickerList.map((category, idx) => <CustomTabPanel key={'ctp-' + category.name} value={tabIdx} index={idx}>
                    <Grid key={category.name} container spacing={3}>
                        {
                            category.stickers.map((sticker, sidx) =>
                            <Grid key={category.name + sticker.name} size={{ xs: 2}}>
                                <StickerDiv
                                    checked={chKey === category.name + sticker.name}
                                    sticker={sticker}
                                    onChange={(val) => {
                                        if ( val ) {
                                            setChKey(category.name + sticker.name);
                                            setSticker(sticker);
                                        } else {
                                            setChKey('');
                                            setSticker(null);
                                        }
                                    }}
                                >
                                </StickerDiv>
                            </Grid>)
                        }
                    </Grid>
                </CustomTabPanel>)
            }
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSelect} autoFocus>
            선택 확인
          </Button>
        </DialogActions>
    </Dialog>);
}

type StickerDialogBtnProps = {
    sticker?: string;
    onChange: (v: Sticker) => void;
};

export function findSticker(stickerList: StickerCategory[], stickerName: string): Sticker|null {
    for ( let i = 0;i < stickerList.length;i++ ) {
        const category = stickerList[i];
        let idx = category.stickers.findIndex((sticker) => stickerName === sticker.name);
        if ( idx !== -1 ) {
            return category.stickers[idx];
        }
    }
    return null;
}

export function StickerDialogBtn(props: StickerDialogBtnProps) {
    const [opened, setOpened] = useState(false);
    const { stickerList, isInit, setStickerList } = useStickerStore((state) => state);
    const [sticker, setSticker] = useState<Sticker|null>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if ( loading ) {
            if ( isInit ) {
                setLoading(false);
                if ( props.sticker ) {
                    setSticker(findSticker(stickerList, props.sticker));
                }
            } else {
                fetch('https://static.spooncast.net/kr/stickers/index.json')
                    .then((res) => res.json())
                    .then((data) => {
                        setStickerList(data.categories);
                        if ( props.sticker ) {
                            setSticker(findSticker(data.categories, props.sticker));
                        }
                        setLoading(false);
                    });
            }
        }
    }, []);

    useEffect(() => {
        if ( props.sticker ) {
            setSticker(findSticker(stickerList, props.sticker));
        }
    }, [props.sticker]);
    

    const handleOnClick = () => {
        setOpened(true);
    }

    const handleOnChange = (newSticker: Sticker) => {
        if ( newSticker ) {
            setSticker(newSticker);
            if ( typeof props.onChange === 'function' ) {
                props.onChange(newSticker);
            }
        }
    }
    const handleOnClose = () => {
        setOpened(false);
    }

    const StickerButton = styled.div`
        cursor: pointer;
        max-width: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;

        &:hover {
            background-color: #dfdfdf;
        }
    `;

    if ( loading ) {
        return <div></div>;
    }

    return (
        <StickerButton
            style={{
                cursor: 'pointer',
                minWidth: '200px',
                borderRadius: '3px',
                border: '1px solid rgba(0 0 0 / 0.23)',
            }}
            onClick={handleOnClick}>
            <StickerDialog
                open={opened}
                sticker={sticker}
                onChange={handleOnChange}
                onClose={handleOnClose}>
            </StickerDialog>
            <div>
            {
                sticker
                ? <div style={{
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <img style={{
                        height: '40px',
                        marginRight: '5px'
                    }} src={sticker.image_url_web} />
                    <Typography fontWeight={'bold'}>{sticker.price}</Typography>
                </div>
                : <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>스푼을 선택해 주세요.</div>
            }
            </div>
        </StickerButton>
    );

}