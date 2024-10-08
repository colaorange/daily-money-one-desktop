

import { accountTypeAreaColor, accountTypeFactor, accountTypeLineColor, toCurrencySymbol } from "@/appUtils";
import { FullLoading } from "@/components/FullLoading";
import TimePeriodInfo from "@/components/TimePeriodInfo";
import { InitialAccountTransDatetime } from "@/constants";
import { usePreferences } from "@/contexts/useApi";
import useI18n from "@/contexts/useI18n";
import useTheme from "@/contexts/useTheme";
import { AccumulationType, TimeGranularity, TimePeriod } from "@/types";
import { getNumberFormat } from "@/utils";
import utilStyles from "@/utilStyles";
import { AccountType, Balance, BalanceReport, Book, BookGranularityBalanceReport } from "@client/model";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import { css, SxProps, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { ChartsReferenceLine, chartsTooltipClasses, ChartsXAxisProps, ChartsYAxisProps, LineChartProps } from "@mui/x-charts";
import { axisClasses } from '@mui/x-charts/ChartsAxis';
import { LineChart } from '@mui/x-charts/LineChart';
import { observer } from "mobx-react-lite";
import moment from "moment";
import { PropsWithChildren, useMemo } from "react";

export type AccountTypesGranularityBalanceLineChartCardProps = PropsWithChildren<{
    book: Book
    accountTypes: AccountType[]

    timePeriod?: TimePeriod
    report?: BookGranularityBalanceReport
    refreshing?: boolean
    accumulationType?: AccumulationType
}>

type DatasetItem = {
    time?: number
} & {
    [key in AccountType]?: number
}

export const AccountTypesGranularityBalanceLineChartCard = observer(function AccountTypesGranularityBalanceLineChartCard({ book, report, accountTypes, timePeriod, refreshing, accumulationType }: AccountTypesGranularityBalanceLineChartCardProps) {


    const { colorScheme, appStyles, theme } = useTheme()
    const i18n = useI18n()
    const { language, label: ll } = i18n
    const { fixBalanceFractionDigits, monthFormat, dateFormat } = usePreferences() || {}

    const chartProps = useMemo(() => {
        if (!report || !timePeriod) {
            return undefined
        }
        const { reports } = report

        const fractionDigits = book.fractionDigits || 0
        const numberFormat = getNumberFormat(language, { maximumFractionDigits: fractionDigits, minimumFractionDigits: fixBalanceFractionDigits ? fractionDigits : undefined })

        const currencySymbol = book.symbol || toCurrencySymbol(i18n, book.currency || '')

        function accountTypeLabel(type: string) {
            return ll(`account.type.${type}`)
        }

        function valueFormatter(value: number | null) {
            return `${value !== null ? numberFormat.format(value) : ''}`;
        }

        let maxAmountTxtLength = 0
        let maxAccAmountTxtLength = 0
        const dataset = [] as LineChartProps['dataset']

        let initItem: DatasetItem
        const accItem: DatasetItem = {
            asset: 0,
            expense: 0,
            liability: 0,
            income: 0,
            other: 0,
        }

        Object.keys(reports).map((key) => {
            const report: BalanceReport = reports[key]

            const time = parseInt(key)
            const { accountTypes: reportAccountTypes } = report
            const accountTypeAmounts = accountTypes?.map((accountType) => {
                const balance = reportAccountTypes[accountType] as Balance | undefined
                const amount = !balance ? 0 : (balance.depositsAmount - balance.withdrawalsAmount) * accountTypeFactor(accountType)
                return { accountType, amount }
            })

            const item: DatasetItem = {
                time
            }
            accountTypeAmounts.forEach(({ accountType, amount }) => {
                maxAmountTxtLength = Math.max(maxAmountTxtLength, valueFormatter(amount).length)
                item[accountType] = amount

                //handle accumulation, pick first number or 0
                if (accumulationType !== AccumulationType.NONE) {
                    if (time === InitialAccountTransDatetime && accumulationType !== AccumulationType.PLUS_INIT) {
                        //ignore init
                        return
                    }

                    const accAmount = (accItem?.[accountType] || 0) + amount
                    maxAccAmountTxtLength = Math.max(maxAccAmountTxtLength, valueFormatter(accAmount).length)
                    item[`${accountType}-Accumulation`] = accAmount
                    accItem[accountType] = accAmount
                }
            })

            if (time === InitialAccountTransDatetime) {
                initItem = item
            } else {
                dataset?.push(item)
            }
        })

        if (dataset!.length === 0) {
            return null
        }

        const minTime = dataset![0].time || undefined
        const maxTime = dataset![dataset!.length - 1].time || undefined

        return {
            dataset,
            xAxis: [
                {
                    dataKey: 'time',
                    valueFormatter: (value: number, ctx: any) => {
                        const m = moment(value)
                        let label = ''
                        switch (timePeriod.granularity) {
                            case TimeGranularity.DAILY:
                                label = m.format(dateFormat)
                                break;
                            case TimeGranularity.MONTHLY:
                                label = m.format(monthFormat)
                                break;
                            case TimeGranularity.YEARLY:
                                label = m.format('YYYY')
                                break;
                        }
                        return ctx.location === 'tooltip' ? `${label} ${currencySymbol ? ` (${currencySymbol})` : ''}` : label
                    },
                    min: minTime,
                    max: maxTime
                } as ChartsXAxisProps,
            ] as LineChartProps['xAxis'],
            yAxis: [
                {
                    id: 'amount',
                } as ChartsYAxisProps,
                accumulationType !== AccumulationType.NONE ? {
                    id: 'accumulation',
                    label: ll(accumulationType === AccumulationType.NORAML ? 'desktop.accumulatedAmount' : 'desktop.initNAccumulatedAmount')
                } as ChartsYAxisProps : undefined
            ].filter((a) => !!a) as LineChartProps['yAxis'],
            series: [...accountTypes.map((accountType) => {
                return {
                    yAxisId: 'amount',
                    dataKey: accountType,
                    label: accountTypeLabel(accountType),
                    valueFormatter,
                    color: accountTypeLineColor(accountType, colorScheme),
                }
            }), ...(accumulationType !== AccumulationType.NONE ? accountTypes.map((accountType) => {
                return {
                    yAxisId: 'accumulation',
                    dataKey: `${accountType}-Accumulation`,
                    label: accountTypeLabel(accountType) + '+',
                    valueFormatter,
                    color: accountTypeAreaColor(accountType, colorScheme),
                    area: true,
                    showMark: false
                }
            }) : []) as LineChartProps['series']],
            margin: {
                //30 for y axis space
                left: (maxAmountTxtLength + 1) * 8 /* + 30 */,
                right: accumulationType !== AccumulationType.NONE ? (maxAccAmountTxtLength + 1) * 8 + 30 : 8,
                top: 8,
                // bottom: 4,
            },
            sx: {
                //y axis label
                // [`.${axisClasses.left} .${axisClasses.label}`]: {
                //     //25 for y axis space
                //     transform: `translate(-${(maxAmountTxtLength + 1) * 8/* - 25*/}px, 0)`,
                // },
                [`.${axisClasses.right} .${axisClasses.label}`]: {
                    //25 for y axis space
                    transform: `translate(${(maxAmountTxtLength + 1) * 8 - 25}px, 0)`,
                }
            } as SxProps<Theme>,
            slotProps: {
                legend: {
                    position: { vertical: 'bottom', horizontal: 'middle' },
                    padding: 0,
                    itemMarkHeight: 14,
                    itemMarkWidth: 14,
                    labelStyle: {
                        fontSize: 16
                    },
                    //don't show accumulation in legend
                    seriesToDisplay: accountTypes.map((accountType) => {
                        return {
                            id: accountType,
                            label: accountTypeLabel(accountType),
                            color: accountTypeLineColor(accountType, colorScheme),
                        }
                    })
                },
                axisContent: {
                    sx: {
                        [`.${chartsTooltipClasses.valueCell}`]: {
                            textAlign: 'right'
                        }
                    }
                },
                noDataOverlay: { message: ll('noData') },
            } as LineChartProps['slotProps']
        }
    }, [report, timePeriod, book.fractionDigits, book.symbol, book.currency, language, fixBalanceFractionDigits, i18n, accumulationType, accountTypes, ll, dateFormat, monthFormat, colorScheme])

    const styles = useMemo(() => {
        return {
            content: css(utilStyles.vlayout, appStyles.lineChart, {
                minHeight: 300,
                position: 'relative'
            }),
            header: css({
                gap: theme.spacing(1),
                justifyContent: 'center'
            }),
            height: 300
        }
    }, [theme, appStyles])

    return <Card>
        <CardContent >
            <Stack direction='row' css={styles.header}>
                {book && <Typography variant="caption">{book.name}</Typography>}
                {timePeriod && <TimePeriodInfo timePeriod={timePeriod} hideGranularity />}
            </Stack>
            <Stack css={styles.content}>
                {chartProps === undefined && <FullLoading />}
                {chartProps === null && <Typography css={utilStyles.vclayout} flex={1}>{ll('noData')}</Typography>}
                {chartProps && <LineChart skipAnimation
                    dataset={chartProps.dataset}
                    series={chartProps.series}
                    xAxis={chartProps.xAxis}
                    yAxis={chartProps.yAxis}
                    margin={chartProps.margin}
                    sx={chartProps.sx}
                    slotProps={chartProps.slotProps}
                    height={styles.height}
                    leftAxis='amount'
                    rightAxis={accumulationType !== AccumulationType.NONE ? 'accumulation' : undefined}
                >
                    {chartProps.dataset?.length && chartProps.dataset?.length > 0 && <ChartsReferenceLine
                        y={0}
                        lineStyle={{ strokeDasharray: '10 5' }}
                        labelAlign="start"
                    />}
                </LineChart>}
                {refreshing && <FullLoading css={utilStyles.absoluteCenter} delay={400} />}
            </Stack>
        </CardContent>
    </Card>
})

export default AccountTypesGranularityBalanceLineChartCard