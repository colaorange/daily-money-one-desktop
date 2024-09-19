import AppToolbar from "@/components/AppToolbar"
import BookSelect from "@/components/BookSelect"
import { useBookStore } from "@/contexts/useStore"
import MainTemplate from "@/templates/MainTemplate"
import utilStyles from "@/utilStyles"
import { Book } from "@client/model"
import { Divider, Toolbar, Typography } from "@mui/material"
import { observer } from "mobx-react-lite"
import { PropsWithChildren, useCallback, useEffect } from "react"

export type BalanceSheetsPageProps = PropsWithChildren

export const BalanceSheetsPage = observer(function BalanceSheetsPage(props: BalanceSheetsPageProps) {
    const bookStore = useBookStore()

    const { books, currentBookId } = bookStore
    useEffect(() => {
        if (!books) {
            bookStore.fetchBooks()
        }
    }, [bookStore, books])

    const onBookChange = useCallback((book?: Book) => {
        bookStore.currentBookId = book?.id
    }, [bookStore])

    return <MainTemplate>
        <AppToolbar>
            <BookSelect bookId={currentBookId} books={books} onChange={onBookChange} />
        </AppToolbar>
        <Divider flexItem />
        <Typography>BalanceSheetsPage</Typography>
    </MainTemplate>
})

export default BalanceSheetsPage