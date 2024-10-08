import useTheme from "@/contexts/useTheme";
import { TimeGranularity, TimePeriod } from "@/types";
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { memo, useCallback, useState } from "react";
import { FaCalendarDays } from "react-icons/fa6";
import TimePeriodPopover from "./TimePeriodPopover";

export type TimePeriodPopoverButtonProps = {
    timePeriod: TimePeriod
    granularityModes?: TimeGranularity[]
    onTimePeriodChange?: (timePeriod: TimePeriod) => void
    hideGranularity?: boolean
    disabled?: boolean
    icon?: React.ReactNode
}

export const TimePeriodPopoverButton = memo(function TimePeriodPopoverButton({ timePeriod, hideGranularity, granularityModes, onTimePeriodChange, disabled, icon }: TimePeriodPopoverButtonProps) {
    const { appStyles } = useTheme()
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const onClick = useCallback((evt: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(evt.currentTarget)
    }, [])

    const onTimePeriodClose = useCallback((timePeriod: TimePeriod) => {
        setAnchorEl(null)
        if (onTimePeriodChange) {
            onTimePeriodChange(timePeriod)
        }
    }, [onTimePeriodChange])

    return <Box>
        <IconButton size="small" css={appStyles.outlineIconButton} onClick={onClick} disabled={disabled}>
            {icon || <FaCalendarDays />}
        </IconButton>

        {anchorEl && !disabled && <TimePeriodPopover
            open={true}
            anchorEl={anchorEl}

            hideGranularity={hideGranularity}
            onTimePeriodClose={onTimePeriodClose}
            timePeriod={timePeriod}
            granularityModes={granularityModes}

            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
        >
        </TimePeriodPopover>}


    </Box>
})


export default TimePeriodPopoverButton